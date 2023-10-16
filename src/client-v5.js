import * as THREE from 'three';
import PartySocket from "partysocket";
import {ALL_TYPES, updateGrid, GRID_WIDTH, GRID_HEIGHT} from "./sharedSim";
import FastIntegerCompression from "fastintcompression";
import Stats from 'stats.js'

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
camera.position.z = 30;  // Adjust this to move the camera further out if required

var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild(stats.dom);
var statsSocket = new Stats();
statsSocket.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( statsSocket.dom );

import GUI from 'lil-gui';

const gui = new GUI({
  closeFolders: true,
  title: 'Stats',

});
const guiControls = {
  overwrite: false,
};
const brushSettings = {
  brushSize: 1
};

const brushController = gui.add(brushSettings, 'brushSize', 1, 50).name('Brush Size').step(1);

const lilStats = {
  frameCount: 0,
  maxMessageDelta: 0,
  averageMessageDelta: 0,
  messageDelta: 0,
};
const controller = gui.add(lilStats, 'frameCount').name('Frame Counter').listen();
const controllerDelta = gui.add(lilStats, 'messageDelta').name('Last Message Delay').listen();
const controllerMaxDelta = gui.add(lilStats, 'maxMessageDelta').name('Max Message Delay').listen();
const controllerAvgDelta = gui.add(lilStats, 'averageMessageDelta').name('Avg Message Delay').listen().decimals(0);
const overwriteController = gui.add(guiControls, 'overwrite').name('Overwrite');

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
let lastMessageTime = 0;
socket.onmessage = function(event) {
  statsSocket.begin();
  if (lastMessageTime > 0) {
    const delta = +Date.now() - lastMessageTime;
    lilStats.messageDelta = delta;
    lilStats.averageMessageDelta = (lilStats.averageMessageDelta * lilStats.frameCount + delta) / (lilStats.frameCount + 1);
    lilStats.maxMessageDelta = Math.max(lilStats.maxMessageDelta, delta);
  }
  lastMessageTime = +Date.now();

  const gridMsg = JSON.parse(event.data);

  if (gridMsg.type === "fullGridUpdate") {
    const base64Data = gridMsg.data;
    const compressedData = base64ToArrayBuffer(base64Data);
    const flatGrid = FastIntegerCompression.uncompress(new Uint8Array(compressedData));
    localGridModel = reshapeGrid(flatGrid);
  }
  statsSocket.end();
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
  lastPosition = null;
  const toolDisplay = document.getElementById('currentTool');
  toolDisplay.textContent = `Current Tool: ${tools[currentTool]}`;
}

window.addEventListener('blur', function() {
  lastPosition = null;
});

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

  // Normalized device coordinates
  const x = ((event.clientX - rect.left) / renderer.domElement.clientWidth) * 2 - 1;
  const y = -((event.clientY - rect.top) / renderer.domElement.clientHeight) * 2 + 1;

  const mousePos = new THREE.Vector3(x, y, 0.5);
  mousePos.unproject(camera);

  // Convert from world coordinates to grid coordinates
  const gridX = Math.floor((mousePos.x + canvasWidth / 2) / CELL_WIDTH);
  const gridY = Math.floor((canvasHeight / 2 - mousePos.y) / CELL_HEIGHT);

  if (lastPosition) {
    const [lastX, lastY] = lastPosition;
    drawLine(lastX, lastY, gridX, gridY);
  } else {
    // Draw a circle at the current position
    drawCircle(gridX, gridY, brushSettings.brushSize);
  }

  lastPosition = [gridX, gridY];
}
let lastPosition;

function placeDot(x, y) {
  localGridModel[y][x] = currentTool;
  socket.send(JSON.stringify({type: "updateCell", x: x, y: y, cellType: currentTool, number: gridStep}));
}

// This function will draw a circle around the given (cx, cy) with the given radius.
function drawCircle(cx, cy, radius) {
  if (radius === 1) {
    placeDot(cx, cy);
    return;
  }
  for (let y = Math.max(0, cy - radius); y <= Math.min(GRID_HEIGHT - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(GRID_WIDTH - 1, cx + radius); x++) {
      const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (distance <= radius) {
        placeDot(x, y);
      }
    }
  }
}

function drawLine(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const deltaX = dx / steps;
  const deltaY = dy / steps;
  let x = x1, y = y1;

  for (let i = 0; i <= steps; i++) {
    drawCircle(Math.round(x), Math.round(y), brushSettings.brushSize);  // Use brush size as the circle's radius
    x += deltaX;
    y += deltaY;
  }
}

renderer.domElement.addEventListener('mouseup', () => {
  dragging = false;
  lastPosition = null;  // Reset the last position when the mouse is released
}, {passive: true});


const canvasWidth = 20;
const canvasHeight = 20;

const CELL_WIDTH = canvasWidth / GRID_WIDTH;
const CELL_HEIGHT = canvasHeight / GRID_HEIGHT;

// Initialize the dataTexture with a correctly sized array.
const initialData = new Uint8Array(GRID_WIDTH * GRID_HEIGHT * 3);
const dataTexture = new THREE.DataTexture(initialData, GRID_WIDTH, GRID_HEIGHT, THREE.RGBAFormat);
dataTexture.needsUpdate = true;

const material = new THREE.MeshBasicMaterial({ map: dataTexture });
const planeGeometry = new THREE.PlaneGeometry(canvasWidth, canvasHeight);
const planeMesh = new THREE.Mesh(planeGeometry, material);
planeMesh.scale.y = -1;
scene.add(planeMesh);

function updateTextureFromGrid() {
  const data = new Uint8Array(GRID_WIDTH * GRID_HEIGHT * 4);
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const idx = (y * GRID_WIDTH + x) * 4;
      const color = getColor(localGridModel[y][x]);
      data[idx] = (color >> 16) & 255;
      data[idx + 1] = (color >> 8) & 255;
      data[idx + 2] = color & 255;
      data[idx + 3] = 255; // Alpha, you can adjust this if needed
    }
  }
  dataTexture.image.data = data;
  dataTexture.needsUpdate = true;
}

function getColor(cellType) {
  switch(cellType) {
    case EMPTY: return 0xAAAAAA;
    case SAND: return 0xFFFF00;
    case OBSTACLE: return 0x000000;
  }
}

function renderLoop() {
  stats.begin();

  lilStats.frameCount++;
  controller.updateDisplay()
  controllerDelta.updateDisplay()
  controllerMaxDelta.updateDisplay()
  controllerAvgDelta.updateDisplay()

  updateTextureFromGrid();

  renderer.render(scene, camera);
  stats.end();
  requestAnimationFrame(renderLoop);
}

renderLoop();