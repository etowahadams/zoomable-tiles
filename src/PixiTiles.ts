import * as d3 from "d3";
import * as d3Tile from "d3-tile";
import * as PIXI from "pixi.js";

type TileCoordinate = [number, number, number];
type TileCoordinateString = string;
type TileInfo = TileCoordinate[] & {
  translate: [number, number];
  scale: number;
};

// Utility function for getting the position of a tile
function getTilePosition(tile: TileCoordinate, tiles: TileInfo) {
  const [x, y] = tile;
  const {
    translate: [tx, ty],
    scale: k,
  } = tiles;
  return [(x + tx) * k, (y + ty) * k];
}

// Creates a texture with random colors
function createTexture() {
  const size = 200;
  const buff = new Uint8Array(size * size * 4);
  const blue = Math.random() * 255;
  const alpha = Math.random() * 255;
  for (let i = 0; i < size * size; i++) {
    buff[i * 4] = Math.floor(i / size); // red
    buff[i * 4 + 1] = Math.floor(i % size); // green
    buff[i * 4 + 2] = blue; // blue
    buff[i * 4 + 3] = alpha; // alpha
  }
  // https://pixijs.download/release/docs/PIXI.BaseTexture.html#fromBuffer
  const texture = PIXI.Texture.fromBuffer(buff, size, size);
  return texture;
}

export class PixiTiles {
  height: number;
  width: number;
  tiler: (transform: d3.ZoomTransform) => TileInfo;
  app: PIXI.Application<HTMLCanvasElement>;
  pMain: PIXI.Container;
  tileCache: Map<TileCoordinateString, PIXI.Sprite> = new Map();

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
        cachedTile.scale.set(
          ((256 / cachedTile.texture.width) * tilesToDraw.scale) / 256
        );
        continue;
      }
      // If the tile is not in the cache, we need to create it
      const texture = createTexture();
      const sprite = new PIXI.Sprite(texture);

      sprite.position.set(x, y);
      const scaledTexture = 256 / sprite.texture.width;
      sprite.scale.set((scaledTexture * tilesToDraw.scale) / 256);
      this.pMain.addChild(sprite);
      // Add the created tile to the cache
      this.tileCache.set(tile.toString(), sprite);
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
