import {initGrid, updateGrid, SAND,} from "./sharedSim";

const {Party, Server, Connection, ConnectionContext} = require("partykit/server");

const UPDATE_FREQUENCY_FPS = 10;

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
    this.party.broadcast(JSON.stringify({
      type: "fullGridUpdate",
      grid: this.grid,
    }));
  }

  onConnect(conn, ctx) {
    conn.send(JSON.stringify(this.grid));
  }

  async onMessage(websocketMessage) {
    if (websocketMessage === "ping") {
      return;
    }

    const event = JSON.parse(websocketMessage);

    if (event.type === "addSand" || event.type === "updateCell") {
      const { x, y, cellType } = event;
      this.grid[y][x] = cellType;
    }
  }

  broadcastGridTimestep(number) {
    this.party.broadcast(JSON.stringify({type: "gridTimestep", number}));
  }
}

export default SandSimulationServer;
