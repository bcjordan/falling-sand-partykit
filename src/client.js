import * as THREE from 'three';
import PartySocket from "partysocket";
import {updateGrid} from "./sharedSim";

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const CELL_SIZE = 1;
const EMPTY = 0;
const SAND = 1;
const OBSTACLE = 2;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0, 100);
camera.position.z = 10;

let localGridModel = new Array(GRID_HEIGHT).fill(0).map(() => new Array(GRID_WIDTH).fill(EMPTY));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Connect to socket server

const socket = new PartySocket({
  host: PARTYKIT_HOST,
  room: "my-new-room",
});

let gridStep = 0;

socket.onmessage = function(event) {
  const gridMsg = JSON.parse(event.data);

  if (gridMsg.type === "gridTimestep") {
    console.log(gridMsg.number);
    gridStep = gridMsg.number;
    localGridModel = updateGrid(localGridModel)
  }
};

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
    localGridModel[gridY][gridX] = SAND;
    socket.send(JSON.stringify({type: "addSand", x: gridX, y: gridY, number: gridStep}));
  }
}


for (let y = 0; y < GRID_HEIGHT; y++) {
  for (let x = 0; x < GRID_WIDTH; x++) {
    const cubeGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: getColor(EMPTY) });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(x - GRID_WIDTH / 2 + 0.5, GRID_HEIGHT / 2 - y - 0.5, 0);
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
