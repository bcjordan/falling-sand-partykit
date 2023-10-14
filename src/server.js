const { Party, Server, Connection, ConnectionContext } = require("partykit/server");

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const EMPTY = 0;
const SAND = 1;
const OBSTACLE = 2;
const UPDATE_FREQUENCY = 5;

// * @implements {Server}
class SandSimulationServer {
  party;
  grid;

  constructor(party) {
    this.party = party;
    this.initGrid();
    this.initSimulation();
  }

  initGrid() {
    this.grid = new Array(GRID_HEIGHT).fill(0).map(() => new Array(GRID_WIDTH).fill(EMPTY));

    for (let x = 0; x < GRID_WIDTH; x++) {
      this.grid[GRID_HEIGHT - 1][x] = OBSTACLE;
    }
    for (let x = 5; x < 15; x++) {
      this.grid[2][x] = SAND;
    }
    for (let x = 0; x < GRID_WIDTH; x++) {
      this.grid[11][x] = OBSTACLE;
    }
  }

  initSimulation() {
    setInterval(() => {
      this.updateGrid();
      // this.broadcastGrid();
    }, 1000 / UPDATE_FREQUENCY);
  }

  broadcastGrid() {
    this.party.broadcast(JSON.stringify(this.grid));
  }

  onConnect(conn, ctx) {
    conn.send(JSON.stringify(this.grid));
  }

  async onMessage(websocketMessage) {
    if (websocketMessage === "ping") {
      return;
    }

    const event = JSON.parse(websocketMessage);

    // Handle the creation of sand particles on the grid
    if (event.type === "addSand") {
      const { x, y } = event;
      this.grid[y][x] = SAND;
      // this.broadcastGrid();
      this.party.storage.put(`item:${x}_${y}`, SAND);
    }
  }


  updateGrid() {
    const newGrid = this.grid.map(row => [...row]);
    for (let y = 1; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.grid[y - 1][x] === SAND) {
          if (newGrid[y][x] === EMPTY) {
            newGrid[y][x] = SAND;
            newGrid[y - 1][x] = EMPTY;
          } else if (x > 0 && newGrid[y][x - 1] === EMPTY) {
            newGrid[y][x - 1] = SAND;
            newGrid[y - 1][x] = EMPTY;
          } else if (x < GRID_WIDTH - 1 && newGrid[y][x + 1] === EMPTY) {
            newGrid[y][x + 1] = SAND;
            newGrid[y - 1][x] = EMPTY;
          }
        }
      }
    }
    this.grid = newGrid;
  }
}

export default SandSimulationServer;
