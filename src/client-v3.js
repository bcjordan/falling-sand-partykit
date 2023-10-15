import * as THREE from 'three';
import PartySocket from "partysocket";
import {ALL_TYPES, updateGrid, GRID_WIDTH, GRID_HEIGHT} from "./sharedSim";
import FastIntegerCompression from "fastintcompression";


const EMPTY = 0;
const SAND = 1;
const OBSTACLE = 2;
const scene = new THREE.Scene();

const aspectRatio = window.innerWidth / window.innerHeight;
const cameraViewHeight = 20;
const cameraViewWidth = cameraViewHeight * aspectRatio;

const camera = new THREE.OrthographicCamera(
  -cameraViewWidth / 2,
  cameraViewWidth / 2,
  cameraViewHeight / 2,
  -cameraViewHeight / 2,
  0,
  100
);

camera.position.z = 10;

let localGridModel = new Array(GRID_HEIGHT).fill(0).map(() => new Array(GRID_WIDTH).fill(EMPTY));

let currentTool = SAND; // Default tool
const tools = {
  [SAND]: 'Sand',
  [EMPTY]: 'Air',
  [OBSTACLE]: 'Obstacle'
};
updateToolDisplay();


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

window.addEventListener('resize', () => {
  const aspectRatio = window.innerWidth / window.innerHeight;
  const cameraViewHeight = 20; // This can be your choice of the height of the camera's view
  const cameraViewWidth = cameraViewHeight * aspectRatio;

  camera.left = -cameraViewWidth / 2;
  camera.right = cameraViewWidth / 2;
  camera.top = cameraViewHeight / 2;
  camera.bottom = -cameraViewHeight / 2;

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.body.appendChild(renderer.domElement);

// Connect to socket server

const socket = new PartySocket({
  host: PARTYKIT_HOST,
  room: "my-new-room",
});

let gridStep = 0;

socket.onmessage = function(event) {
  const gridMsg = JSON.parse(event.data);

  if (gridMsg.type === "fullGridUpdate") {
    const base64Data = gridMsg.data;
    const compressedData = base64ToArrayBuffer(base64Data);
    const flatGrid = FastIntegerCompression.uncompress(new Uint8Array(compressedData));
    localGridModel = reshapeGrid(flatGrid);
  }
};

function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}



function reshapeGrid(flatGrid) {
  const newGrid = [];
  for (let i = 0; i < GRID_HEIGHT; i++) {
    newGrid.push(flatGrid.slice(i * GRID_WIDTH, (i + 1) * GRID_WIDTH));
  }
  return newGrid;
}

function convertBitmapsToGrid(bitmaps) {
  const newGrid = new Array(GRID_HEIGHT).fill(0).map(() => new Array(GRID_WIDTH).fill(EMPTY));
  for (let type of Object.keys(bitmaps)) {
    for (const value of bitmaps[type]) {
      const y = Math.floor(value / GRID_WIDTH);
      const x = value % GRID_WIDTH;
      newGrid[y][x] = parseInt(type);
    }
  }
  return newGrid;
}


document.getElementById('currentTool').addEventListener('click', () => {
  currentTool = (currentTool + 1) % ALL_TYPES.length;
  updateToolDisplay();
});

document.addEventListener('keydown', (event) => {
  switch(event.key) {
    case '1':
      currentTool = SAND;
      break;
    case '2':
      currentTool = EMPTY;
      break;
    case '3':
      currentTool = OBSTACLE;
      break;
  }
  updateToolDisplay();
});

function updateToolDisplay() {
  const toolDisplay = document.getElementById('currentTool');
  toolDisplay.textContent = `Current Tool: ${tools[currentTool]}`;
}



renderer.domElement.addEventListener('click', createSand, { passive: true });

let dragging = false;

renderer.domElement.addEventListener('mousedown', (event) => {
  dragging = true;
  createSand(event);
}, { passive: true });

renderer.domElement.addEventListener('mousemove', (event) => {
  if (dragging) {
    createSand(event);
  }
}, {passive: true});

renderer.domElement.addEventListener('mouseup', () => {
  dragging = false;
}, {passive: true});

renderer.domElement.addEventListener('touchstart', (event) => {
  dragging = true;
  createSand(event.touches[0]);
  // event.preventDefault();
}, {passive: true});

renderer.domElement.addEventListener('touchmove', (event) => {
  if (dragging) {
    createSand(event.touches[0]);
  }
  // event.preventDefault();
}, {passive: true});

renderer.domElement.addEventListener('touchend', () => {
  dragging = false;
});

function createSand(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / renderer.domElement.clientWidth) * 2 - 1;
  const y = -((event.clientY - rect.top) / renderer.domElement.clientHeight) * 2 + 1;

  const mousePos = new THREE.Vector3(x, y, 0.5);
  mousePos.unproject(camera);

  const gridX = Math.floor(mousePos.x + GRID_WIDTH / 2);
  const gridY = Math.floor(-mousePos.y + GRID_HEIGHT / 2);

  if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
    localGridModel[gridY][gridX] = currentTool === EMPTY ? EMPTY : currentTool;
    socket.send(JSON.stringify({type: "updateCell", x: gridX, y: gridY, cellType: currentTool, number: gridStep}));
  }
}

const canvasWidth = 20; // The width of the area in which you want to fit the grid. Adjust this value as needed.
const canvasHeight = 20; // The height of the area in which you want to fit the grid. Adjust this value as needed.

const CELL_WIDTH = canvasWidth / GRID_WIDTH;
const CELL_HEIGHT = canvasHeight / GRID_HEIGHT;

for (let y = 0; y < GRID_HEIGHT; y++) {
  for (let x = 0; x < GRID_WIDTH; x++) {
    const cubeGeometry = new THREE.BoxGeometry(CELL_WIDTH, CELL_HEIGHT, CELL_WIDTH); // assuming depth = width
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: getColor(EMPTY) });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(x * CELL_WIDTH - canvasWidth / 2 + CELL_WIDTH / 2, canvasHeight / 2 - y * CELL_HEIGHT - CELL_HEIGHT / 2, 0);
    scene.add(cube);
  }
}


function getColor(cellType) {
  switch(cellType) {
    case EMPTY: return 0xAAAAAA;
    case SAND: return 0xFFFF00;
    case OBSTACLE: return 0x000000;
  }
}

function renderLoop() {
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const index = y * GRID_WIDTH + x;
      scene.children[index].material.color.setHex(getColor(localGridModel[y][x]));
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

renderLoop();
