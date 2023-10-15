import {initGrid, updateGrid, SAND, ALL_TYPES,} from "./sharedSim";
import FastIntegerCompression from "fastintcompression";
const { Party, Server, Connection, ConnectionContext } = require("partykit/server");

const UPDATE_FREQUENCY_FPS = 30;

// * @implements {Server}
class SandSimulationServer {
  party;
  grid;
  gridStep = 0;

  constructor(party) {
    this.party = party;
    this.initGrid();
    this.startSimulationLoop();
  }

  initGrid() {
    this.gridStep = 0;
    this.grid = initGrid();
    this.broadcastGridTimestep(this.gridStep);
  }

  startSimulationLoop() {
    setInterval(() => {
      this.grid = updateGrid(this.grid);
      this.broadcastGridTimestep(this.gridStep++);
      this.broadcastFullGridUpdate();
    }, 1000 / UPDATE_FREQUENCY_FPS);
  }

  broadcastFullGridUpdate() {
    let input = this.flattenGrid(this.grid);
    const compressedGrid = FastIntegerCompression.compress(input);
    const base64CompressedGrid = this.arrayBufferToBase64(compressedGrid);
    this.party.broadcast(JSON.stringify({ type: "fullGridUpdate", data: base64CompressedGrid }));
  }

  flattenGrid(grid) {
    return grid.reduce((acc, row) => acc.concat(row), []);
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }


  onConnect(conn, ctx) {
    // const compressedGrid = FastIntegerCompression.compress(this.flattenGrid(this.grid));
    // conn.send(JSON.stringify({ type: "fullGridUpdate", data: this.flattenGrid(this.grid) }));
  }

  async onMessage(websocketMessage) {
    if (websocketMessage === "ping") {
      return;
    }

    const event = JSON.parse(websocketMessage);

    if (event.type === "addSand" || event.type === "updateCell") {
      const { x, y, cellType } = event;
      // console.log(`Received ${event.type} event: ${x}, ${y}, ${cellType}`);
      let invalidCoords = y >= this.grid.length || x >= this.grid[0].length;
      let invalidCellType = cellType >= ALL_TYPES.length;
      if (invalidCoords || invalidCellType) {
        return;
      }
      this.grid[y][x] = cellType;
    }
  }

  broadcastGridTimestep(number) {
    this.party.broadcast(JSON.stringify({type: "gridTimestep", number}));
  }
}

export default SandSimulationServer;
