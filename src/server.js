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
    }, 1000 / UPDATE_FREQUENCY_FPS);
  }

  broadcastFullGridUpdate() {
    // this.party.broadcast(JSON.stringify(this.grid));
  }

  onConnect(conn, ctx) {
    // conn.send(JSON.stringify(this.grid));
  }

  async onMessage(websocketMessage) {
    if (websocketMessage === "ping") {
      return;
    }

    const event = JSON.parse(websocketMessage);

    // Handle the creation of sand particles on the grid
    if (event.type === "addSand") {
      const {x, y} = event;
      this.grid[y][x] = SAND;
      // this.broadcastGrid();
      // this.party.storage.put(`item:${x}_${y}`, SAND);
    }
  }

  broadcastGridTimestep(number) {
    this.party.broadcast(JSON.stringify({type: "gridTimestep", number}));
  }
}

export default SandSimulationServer;
