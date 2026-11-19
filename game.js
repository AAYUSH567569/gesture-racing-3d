
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const container = document.getElementById('game-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 35, 110);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

camera.position.set(0, 7, 13);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// LIGHTING
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 10, 5);
scene.add(light);

// ROAD
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 120),
  new THREE.MeshStandardMaterial({ color: 0x292929 })
);

road.rotation.x = -Math.PI / 2;
road.position.set(0, 0, -35);
scene.add(road);

// ROAD SIDES
const sideMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff
});

for (const x of [-5.8, 5.8]) {
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.03, 120),
    sideMaterial
  );
  line.position.set(x, 0.03, -35);
  scene.add(line);
}

// LANE MARKINGS
const markers = [];

for (const x of [-2, 2]) {
  for (let i = 0; i < 12; i++) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    marker.position.set(x, 0.04, -i * 10);
    scene.add(marker);
    markers.push(marker);
  }
}

// PLAYER CAR
const car = new THREE.Group();

const body = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 0.55, 2.8),
  new THREE.MeshStandardMaterial({ color: 0xff2020 })
);

body.position.y = 0.65;
car.add(body);

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.15, 0.65, 1.3),
  new THREE.MeshStandardMaterial({
    color: 0x182b45,
    metalness: 0.3,
    roughness: 0.3
  })
);

cabin.position.set(0, 1.2, -0.2);
car.add(cabin);

// WHEELS
const wheelMaterial = new THREE.MeshStandardMaterial({
  color: 0x111111
});

for (const x of [-0.85, 0.85]) {
  for (const z of [-0.85, 0.85]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16),
      wheelMaterial
    );

    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.35, z);
    car.add(wheel);
  }
}

car.position.set(0, 0, 5);
scene.add(car);

// GAME CONTROLS
let left = false;
let right = false;
let speed = 18;

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
    left = true;
  }

  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
    right = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
    left = false;
  }

  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
    right = false;
  }
});

// MOBILE BUTTONS
const controls = document.createElement('div');
controls.id = 'mobile-controls';

controls.innerHTML = `
  <button id="left-btn">◀</button>
  <button id="right-btn">▶</button>
`;

document.body.appendChild(controls);

function setupButton(id, direction) {
  const btn = document.getElementById(id);

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (direction === 'left') left = true;
    if (direction === 'right') right = true;
  });

  ['pointerup', 'pointerleave', 'pointercancel'].forEach(event => {
    btn.addEventListener(event, () => {
      if (direction === 'left') left = false;
      if (direction === 'right') right = false;
    });
  });
}

setupButton('left-btn', 'left');
setupButton('right-btn', 'right');

// GAME LOOP
let previousTime = 0;

function animate(time) {
  requestAnimationFrame(animate);

  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;

  if (left) car.position.x -= 7 * delta;
  if (right) car.position.x += 7 * delta;

  car.position.x = THREE.MathUtils.clamp(
    car.position.x,
    -4.5,
    4.5
  );

  // ANIMATED ROAD
  markers.forEach(marker => {
    marker.position.z += speed * delta;

    if (marker.position.z > 12) {
      marker.position.z -= 120;
    }
  });

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

// RESPONSIVE SCREEN
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});
