import * as d3 from "d3";
import { Selection } from "d3";
import * as d3Tile from "d3-tile";
import * as PIXI from "pixi.js";

function rot(
  n: number,
  x: number,
  y: number,
  rx: number,
  ry: number
): [number, number] {
  if (!ry) {
    if (rx) {
      x = n - 1 - x;
      y = n - 1 - y;
    }
    return [y, x];
  }
  return [x, y];
}

function hilbert(x: number, y: number, z: number) {
  const n = 1 << z;
  let rx,
    ry,
    s,
    d = 0;

  for (s = n >> 1; s > 0; s >>= 1) {
    rx = (x & s) > 0;
    ry = (y & s) > 0;
    d += s * s * ((3 * Number(rx)) ^ Number(ry));
    [x, y] = rot(n, x, y, Number(rx), Number(ry));
  }
  return d / (1 << (z * 2));
}

function getTilePosition(tile: TileCoordinate, tiles: TileInfo) {
  const [x, y] = tile;
  const {
    translate: [tx, ty],
    scale: k,
  } = tiles;
  return [(x + tx) * k, (y + ty) * k];
}

type TileCoordinate = [number, number, number];
type TileCoordinateString = string;
type TileInfo = TileCoordinate[] & {
  translate: [number, number];
  scale: number;
};

export class PixiTiles {
  height: number;
  width: number;
  tiler: (transform: d3.ZoomTransform) => TileInfo;
  app: PIXI.Application<HTMLCanvasElement>;
  pMain: PIXI.Container;
  tileCache: Map<TileCoordinateString, PIXI.Graphics> = new Map();

  constructor(container: HTMLElement, height: number, width: number) {
    this.height = height;
    this.width = width;
    
    // setup the PIXI app
    this.app = new PIXI.Application<HTMLCanvasElement>({
      width,
      height,
      antialias: true,
      view: document.createElement("canvas"),
      backgroundColor: 0xffffff,
    });
    container.appendChild(this.app.view);
    this.pMain = new PIXI.Container();
    this.app.stage.addChild(this.pMain);

    // Create tiler
    this.tiler = d3Tile.tile().extent([
      [0, 0],
      [width, height],
    ]);

    // Create the zoom behavior
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([1 << 8, 1 << 22])
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event) => this.zoomed(event.transform));

    // Setup the zoom on the canvas
    d3.select<HTMLCanvasElement, unknown>(this.app.view)
      .call(zoomBehavior)
      .call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(width >> 1, height >> 1).scale(1 << 10)
      );

    // Determine the initial tiles to draw and draw them
    const tilesToDraw = this.tiler(d3.zoomTransform(this.app.view));
    this.draw(tilesToDraw);
  }

  draw(tilesToDraw: TileInfo) {
    // Iterate over the tiles and reposition or create them
    for (const tile of tilesToDraw) {
      const cachedTile = this.tileCache.get(tile.toString());
      const [x, y] = getTilePosition(tile, tilesToDraw);
      // If the tile is already in the cache, we just need to reposition it
      if (cachedTile) {
        cachedTile.visible = true;
        cachedTile.position.set(x, y);
        cachedTile.scale.set(tilesToDraw.scale / 256);
        continue;
      }
      // If the tile is not in the cache, we need to create it
      const gTile = new PIXI.Graphics();
      gTile.beginFill(d3.interpolateRainbow(hilbert(...tile)));
      gTile.drawRect(0, 0, 256, 256);
      gTile.endFill();
      gTile.position.set(x, y);
      gTile.scale.set(tilesToDraw.scale / 256);
      this.pMain.addChild(gTile);
      // Add the created tile to the cache
      this.tileCache.set(tile.toString(), gTile);
    }
    // Hide any tiles that are in the cache but not in the tilesToDraw
    // The following could be optimized, but this is fine for now for simplicity
    for (const [tileString, gTile] of this.tileCache) {
      if (!tilesToDraw.find((tile) => tile.toString() === tileString)) {
        gTile.visible = false;
      }
    }
  }

  // This function is called when the zoom changes
  zoomed(transform: d3.ZoomTransform) {
    const tilesToDraw = this.tiler(transform); // gives you [[x, y, z], ...], scale, translate
    this.draw(tilesToDraw);
  }
}
