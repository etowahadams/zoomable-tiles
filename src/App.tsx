import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { map } from "./tiles-svg";
import { SvgTiles } from "./SvgTiles";
import { PixiTiles } from "./PixiTiles";

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Original D3 example
    // const plotElement = document.getElementById("map") as HTMLDivElement
    // plotElement.innerHTML = "";
    // plotElement.appendChild(map(800, 800));

    // Object Oriented Approach
    // const svgTilesElement = document.getElementById("svgTiles") as HTMLDivElement
    // svgTilesElement.innerHTML = "";
    // new SvgTiles(svgTilesElement, 1000, 1000);

    // const pixiTilesElement = document.getElementById("pixiTiles") as HTMLDivElement
    // pixiTilesElement.innerHTML = "";
    // new PixiTiles(pixiTilesElement, 1000, 1000);

    const pixiTilesElement = document.getElementById("pixiTiles") as HTMLDivElement
    pixiTilesElement.innerHTML = "";
    new PixiTiles(pixiTilesElement, 1000, 1000);
  }, []);

  return (
    <div className="card">
     <h1>Zoomed Tiles</h1>
     <div id="pixiTiles"></div>
     <div id="svgTiles"></div>
      {/* <div id="map"></div> */}
    </div>
  );
}

export default App;
