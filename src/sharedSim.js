

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 20;
export const EMPTY = 0;
export const SAND = 1;
export const OBSTACLE = 2;

export function initGrid() {
  const grid = new Array(GRID_HEIGHT).fill(0).map(() => new Array(GRID_WIDTH).fill(EMPTY));
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[GRID_HEIGHT - 1][x] = OBSTACLE;
  }
  for (let x = 5; x < 15; x++) {
    grid[2][x] = SAND;
  }
  for (let x = 0; x < GRID_WIDTH; x++) {
    grid[11][x] = OBSTACLE;
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
  for (let y = 1; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (inputGrid[y - 1][x] === SAND) {
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
  return newGrid;
}