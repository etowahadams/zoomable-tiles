import * as d3 from "d3";
import { Selection } from "d3";
import * as d3Tile from "d3-tile";

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

export class SvgTiles {
  element: HTMLElement;
  height: number;
  width: number;
  tiler: d3Tile.Tile<number, number>;
  gTiles: Selection<SVGGElement, unknown, SVGGElement, undefined>;
  tileGroup: Selection<SVGSVGElement, undefined, null, undefined>;

  constructor(element: HTMLElement, height: number, width: number) {
    this.element = element;
    this.height = height;
    this.width = width;
    this.tiler = d3Tile.tile().extent([
      [0, 0],
      [width, height],
    ]);

    // Setup the SVG
    const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);
    element.appendChild(svg.node());

    // Setup where the tiles get drawn to
    this.tileGroup = svg
      .append("g")
      .attr("pointer-events", "none")
      .attr("font-family", "var(--sans-serif)")
      .attr("font-size", 16);
    this.gTiles = this.tileGroup.selectAll("g");

    // Setup the zoom
    const zoom = d3
      .zoom()
      .scaleExtent([1 << 8, 1 << 22])
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event) => this.zoomed(event.transform));

    // Setup the zoom on the SVG
    svg
      .call(zoom)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(width >> 1, height >> 1).scale(1 << 10)
      );
  }

  zoomed(transform: d3.ZoomTransform) {
    const tiles = this.tiler(transform); // gives you [[x, y, z], ...], scale, translate

    this.tileGroup.attr(
      "transform",
      `
      scale(${tiles.scale})
      translate(${tiles.translate.join(",")})
    `
    );

    this.gTiles = this.gTiles
      .data(tiles, (d) => d)
      .join((enter) =>
        enter
          .append("g")
          .attr(
            "transform",
            ([x, y]) => `translate(${x}, ${y}) scale(${1 / 256})`
          )
          .call((g) =>
            g
              .append("rect")
              .attr("fill", (d) => d3.interpolateRainbow(hilbert(...d)))
              .attr("fill-opacity", 0.5)
              .attr("stroke", "black")
              .attr("width", 256)
              .attr("height", 256)
          )
          .call((g) =>
            g
              .append("text")
              .attr("x", "0.4em")
              .attr("y", "1.2em")
              .text((d) => d.join("/"))
          )
      );
  }
}
