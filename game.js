
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const container = document.getElementById('game-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 10, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 1));

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 200),
  new THREE.MeshStandardMaterial({ color: 0x333333 })
);

road.rotation.x = -Math.PI / 2;
road.position.z = -80;
scene.add(road);

const car = new THREE.Group();

const body = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 0.5, 2.5),
  new THREE.MeshStandardMaterial({ color: 0xff2222 })
);

body.position.y = 0.6;
car.add(body);

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.55, 1.1),
  new THREE.MeshStandardMaterial({ color: 0x222244 })
);

cabin.position.set(0, 1.1, -0.2);
car.add(cabin);

car.position.z = 3;
scene.add(car);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
