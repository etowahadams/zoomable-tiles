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

type TileCoordinate = [number, number, number];
type TileInfo = TileCoordinate[] & {
  translate: [number, number];
  scale: number;
};

export class PixiTiles {
  height: number;
  width: number;
  tiler: (transform: d3.ZoomTransform) => TileInfo;
  tileInfo: TileInfo;
  app: PIXI.Application<HTMLCanvasElement>;
  pMain: PIXI.Container;

  constructor(container: HTMLElement, height: number, width: number) {
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

    this.height = height;
    this.width = width;

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
    this.tileInfo = this.tiler(d3.zoomTransform(this.app.view));
    this.draw();
  }

  draw() {
    function getTilePosition(tile: TileCoordinate, tiles: TileInfo) {
      const [x, y] = tile;
      const {
        translate: [tx, ty],
        scale: k,
      } = tiles;
      return [(x + tx) * k, (y + ty) * k];
    }
    this.pMain.removeChildren();

    for (const tile of this.tileInfo) {
      const [x, y] = getTilePosition(tile, this.tileInfo);
      const gTile = new PIXI.Graphics();
      gTile.beginFill(Math.random() * 0xffffff);
      gTile.drawRect(0, 0, 256, 256);
      gTile.endFill();
      gTile.position.set(x, y);
      gTile.scale.set(this.tileInfo.scale / 256);
      this.pMain.addChild(gTile);
    }
  }

  zoomed(transform: d3.ZoomTransform) {
    const tiles = this.tiler(transform); // gives you [[x, y, z], ...], scale, translate
    this.tileInfo = tiles;
    this.draw();
  }
}
