

export const GRID_WIDTH = 256;
export const GRID_HEIGHT = 256;

export const EMPTY = 0;
export const SAND = 1;
export const OBSTACLE = 2;
export const ALL_TYPES = [EMPTY, SAND, OBSTACLE];

export function initGrid() {
  const grid = new Array(GRID_HEIGHT).fill(0).map(() => new Array(GRID_WIDTH).fill(EMPTY));
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[GRID_HEIGHT - 1][x] = OBSTACLE;
  }
  for (let x = 5; x < GRID_WIDTH; x++) {
    grid[19][x] = SAND;
  }
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[20][x] = OBSTACLE;
  }
  return grid;
}

export function gridIsFull(grid) {
  return grid.every(row => row.every(cell => cell !== EMPTY));
}

export function updateGrid(inputGrid) {
  if (gridIsFull(inputGrid)) {
    return initGrid();
  }

  const newGrid = inputGrid.map(row => [...row]);

  // Model the behavior of sand settling down
  for (let y = GRID_HEIGHT - 2; y >= 0; y--) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (inputGrid[y][x] === SAND) {
        if (newGrid[y + 1][x] === EMPTY) {
          newGrid[y + 1][x] = SAND;
          newGrid[y][x] = EMPTY;
        } else if (x > 0 && newGrid[y + 1][x - 1] === EMPTY) {
          newGrid[y + 1][x - 1] = SAND;
          newGrid[y][x] = EMPTY;
        } else if (x < GRID_WIDTH - 1 && newGrid[y + 1][x + 1] === EMPTY) {
          newGrid[y + 1][x + 1] = SAND;
          newGrid[y][x] = EMPTY;
        }
      }
    }
  }

  // Model the behavior of air bubbling up
  for (let y = 1; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (inputGrid[y][x] === EMPTY && inputGrid[y - 1][x] === SAND) {
        newGrid[y][x] = SAND;
        newGrid[y - 1][x] = EMPTY;
      }
    }
  }

  return newGrid;
}
