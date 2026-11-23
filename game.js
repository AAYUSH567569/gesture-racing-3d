
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/* ==========================================
   GESTURE RACING 3D
   Main Game Engine
========================================== */

const $ = (id) => document.getElementById(id);

const container = $("game-container");
const video = $("webcam");

let scene, camera, renderer, clock;
let player, road, worldGroup;
let gameRunning = false;
let paused = false;
let gameOver = false;

let speed = 0;
let score = 0;
let coins = 0;
let nitro = 100;
let distance = 0;

let cameraMode = "behind";
let controlMode = "keyboard";
let selectedCar = "red";
let currentWorld;

let obstacles = [];
let coinObjects = [];
let roadLines = [];
let buildings = [];

let keys = {};
let steering = 0;
let accelerating = false;
let braking = false;
let nitroActive = false;

let handLandmarker = null;
let webcamActive = false;
let lastVideoTime = -1;
let gestureSteer = 0;
let gestureAccelerate = false;
let gestureBrake = false;
let gestureNitro = false;

const MAX_DISTANCE = 1500;
const ROAD_WIDTH = 14;
const LANES = [-4, 0, 4];

const worlds = [
    {
        name: "NEON CITY",
        background: 0x090b25,
        road: 0x17172b,
        line: 0x00eaff,
        building: 0x19234d,
        light: 0xff00dd,
        fog: 0x090b25
    },
    {
        name: "REALISTIC HIGHWAY",
        background: 0x87b8e5,
        road: 0x30343a,
        line: 0xffffff,
        building: 0x52764c,
        light: 0xffcc44,
        fog: 0x87b8e5
    },
    {
        name: "CITY STREET",
        background: 0x1b2638,
        road: 0x343943,
        line: 0xffd166,
        building: 0x35475c,
        light: 0xff8844,
        fog: 0x1b2638
    }
];

/* ==========================================
   INITIALIZE GAME
========================================== */

function init() {
    scene = new THREE.Scene();
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(
        65,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.zIndex = "0";

    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 2));

    const sunlight = new THREE.DirectionalLight(0xffffff, 2);
    sunlight.position.set(-5, 15, 8);
    sunlight.castShadow = true;
    scene.add(sunlight);

    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);

    $("loading").classList.add("hidden");

    createEnvironment(0);
    createPlayer();

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    bindButtons();
    animate();
}

/* ==========================================
   RANDOM ENVIRONMENT
========================================== */

function createEnvironment(index) {
    currentWorld = worlds[index];

    scene.background = new THREE.Color(currentWorld.background);
    scene.fog = new THREE.Fog(currentWorld.fog, 35, 160);

    if (worldGroup) {
        scene.remove(worldGroup);
    }

    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    road = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_WIDTH, 300),
        new THREE.MeshStandardMaterial({
            color: currentWorld.road,
            roughness: 0.85
        })
    );

    road.rotation.x = -Math.PI / 2;
    road.position.z = -100;
    road.receiveShadow = true;
    worldGroup.add(road);

    // Road edges
    [-7.2, 7.2].forEach(x => {
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.15, 300),
            new THREE.MeshStandardMaterial({
                color: currentWorld.line,
                emissive: currentWorld.line,
                emissiveIntensity: 0.5
            })
        );

        edge.position.set(x, 0.08, -100);
        worldGroup.add(edge);
    });

    // Lane markings
    roadLines = [];

    [-2, 2].forEach(x => {
        for (let i = 0; i < 30; i++) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.04, 3),
                new THREE.MeshBasicMaterial({
                    color: currentWorld.line
                })
            );

            line.position.set(x, 0.06, -i * 10);
            worldGroup.add(line);
            roadLines.push(line);
        }
    });

    // Environment buildings and scenery
    buildings = [];

    for (let i = 0; i < 45; i++) {
        [-1, 1].forEach(side => {
            const height = 5 + Math.random() * 18;

            const building = new THREE.Mesh(
                new THREE.BoxGeometry(
                    4 + Math.random() * 4,
                    height,
                    5 + Math.random() * 5
                ),
                new THREE.MeshStandardMaterial({
                    color: currentWorld.building,
                    roughness: 0.8
                })
            );

            building.position.set(
                side * (12 + Math.random() * 10),
                height / 2,
                -i * 9 - 10
            );

            worldGroup.add(building);
            buildings.push(building);
        });
    }

    $("world-name").textContent = currentWorld.name;
}

/* ==========================================
   CREATE PLAYER CAR
========================================== */

function createCar(color) {
    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.65,
        roughness: 0.25
    });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.65, 4),
        bodyMaterial
    );

    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.75, 1.9),
        new THREE.MeshStandardMaterial({
            color: 0x18283c,
            metalness: 0.5,
            roughness: 0.15
        })
    );

    cabin.position.set(0, 1.42, -0.3);
    group.add(cabin);

    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
    });

    const wheels = [];

    for (const x of [-1.12, 1.12]) {
        for (const z of [-1.25, 1.25]) {
            const wheel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.42, 0.42, 0.25, 20),
                wheelMaterial
            );

            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.48, z);
            group.add(wheel);
            wheels.push(wheel);
        }
    }

    const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0xff2222
    });

    for (const x of [-0.72, 0.72]) {
        const light = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.16, 0.08),
            lightMaterial
        );

        light.position.set(x, 0.85, 2.03);
        group.add(light);
    }

    group.userData.wheels = wheels;

    return group;
}

function createPlayer() {
    if (player) scene.remove(player);

    const colors = {
        red: 0xff1744,
        blue: 0x168cff,
        green: 0x00dd88
    };

    player = createCar(colors[selectedCar]);
    player.position.set(0, 0, 8);
    scene.add(player);
}

/* ==========================================
   TRAFFIC AND OBSTACLES
========================================== */

function createObstacle() {
    const colors = [0xff3344, 0xffaa22, 0x168cff];

    const car = createCar(
        colors[Math.floor(Math.random() * colors.length)]
    );

    car.position.set(
        LANES[Math.floor(Math.random() * LANES.length)],
        0,
        -100
    );

    car.scale.setScalar(0.85);
    scene.add(car);
    obstacles.push(car);
}

function createCoin() {
    const coin = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.15, 10, 20),
        new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x885500
        })
    );

    coin.position.set(
        LANES[Math.floor(Math.random() * LANES.length)],
        1.5,
        -100
    );

    scene.add(coin);
    coinObjects.push(coin);
}

/* ==========================================
   START AND RESET RACE
========================================== */

function startRace() {
    resetRace();

    const randomIndex = Math.floor(Math.random() * worlds.length);
    createEnvironment(randomIndex);

    gameRunning = true;
    paused = false;
    gameOver = false;

    $("main-menu").classList.add("hidden");
    $("pause-menu").classList.add("hidden");
    $("game-over").classList.add("hidden");
    $("garage-menu").classList.add("hidden");
    $("game-hud").classList.remove("hidden");

    cameraMode = "behind";
    updateCameraButton();

    if (controlMode === "gesture") {
        startWebcam();
    }

    clock.start();
}

function resetRace() {
    obstacles.forEach(o => scene.remove(o));
    coinObjects.forEach(c => scene.remove(c));

    obstacles = [];
    coinObjects = [];

    speed = 0;
    score = 0;
    coins = 0;
    nitro = 100;
    distance = 0;
    steering = 0;

    $("speed").textContent = "0";
    $("score").textContent = "0";
    $("coins").textContent = "0";
    $("nitro-fill").style.width = "100%";

    createPlayer();
}

/* ==========================================
   KEYBOARD CONTROLS
========================================== */

function keyDown(e) {
    keys[e.key.toLowerCase()] = true;

    if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "]
        .includes(e.key.toLowerCase())
    ) {
        e.preventDefault();
    }
}

function keyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function updateKeyboard() {
    if (controlMode !== "keyboard") return;

    accelerating =
        keys["w"] || keys["arrowup"];

    braking =
        keys["s"] || keys["arrowdown"];

    steering =
        (keys["a"] || keys["arrowleft"] ? -1 : 0) +
        (keys["d"] || keys["arrowright"] ? 1 : 0);

    nitroActive =
        (keys["shift"] || keys[" "]) && nitro > 0;
}

/* ==========================================
   MOBILE BUTTON CONTROLS
========================================== */

function bindHold(id, callback) {
    const button = $(id);

    button.addEventListener("pointerdown", e => {
        e.preventDefault();
        callback(true);
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach(event => {
        button.addEventListener(event, () => callback(false));
    });
}

function bindMobileControls() {
    bindHold("left-btn", v => {
        keys["arrowleft"] = v;
    });

    bindHold("right-btn", v => {
        keys["arrowright"] = v;
    });

    bindHold("accelerate-btn", v => {
        keys["arrowup"] = v;
    });

    bindHold("brake-btn", v => {
        keys["arrowdown"] = v;
    });
}

/* ==========================================
   MEDIAPIPE HAND GESTURE CONTROL
========================================== */

async function loadHandTracking() {
    try {
        $("gesture-text").textContent = "Loading hand tracking...";

        const { FilesetResolver, HandLandmarker } =
            await import(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm"
            );

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        handLandmarker = await HandLandmarker.createFromOptions(
            vision,
            {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 2
            }
        );

        $("gesture-text").textContent = "Hand tracking ready";
        return true;

    } catch (error) {
        console.error("Hand tracking error:", error);
        $("gesture-text").textContent = "Hand tracking unavailable";
        return false;
    }
}

async function startWebcam() {
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Webcam requires HTTPS or localhost.");
        }

        if (!handLandmarker) {
            const ready = await loadHandTracking();
            if (!ready) throw new Error("Hand tracking failed.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: "user"
            }
        });

        video.srcObject = stream;
        video.style.display = "block";

        await video.play();

        webcamActive = true;
        $("gesture-help").classList.remove("hidden");

        $("gesture-text").textContent = "Show your hand to camera";

    } catch (error) {
        console.error("Webcam error:", error);

        $("gesture-text").textContent =
            "Camera permission required";
    }
}

function stopWebcam() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    webcamActive = false;
    video.style.display = "none";
    $("gesture-help").classList.add("hidden");

    gestureAccelerate = false;
    gestureBrake = false;
    gestureNitro = false;
    gestureSteer = 0;
}

function processGestures() {
    if (
        !webcamActive ||
        !handLandmarker ||
        video.readyState < 2
    ) return;

    if (video.currentTime === lastVideoTime) return;

    lastVideoTime = video.currentTime;

    const results = handLandmarker.detectForVideo(
        video,
        performance.now()
    );

    if (!results.landmarks || results.landmarks.length === 0) {
        $("gesture-text").textContent = "Show your hand";
        gestureSteer = 0;
        gestureAccelerate = false;
        gestureBrake = false;
        gestureNitro = false;
        return;
    }

    const hand = results.landmarks[0];

    // Wrist and index finger landmarks
    const wrist = hand[0];
    const index = hand[8];
    const middle = hand[12];
    const ring = hand[16];
    const pinky = hand[20];

    const isExtended = (fingerTip, fingerBase) =>
        fingerTip.y < fingerBase.y;

    const openFingers = [
        isExtended(index, hand[6]),
        isExtended(middle, hand[10]),
        isExtended(ring, hand[14]),
        isExtended(pinky, hand[18])
    ].filter(Boolean).length;

    // Hand tilt controls steering
    gestureSteer = THREE.MathUtils.clamp(
        (wrist.x - 0.5) * 4,
        -1,
        1
    );

    gestureAccelerate = openFingers >= 3;
    gestureBrake = openFingers === 0;

    // Both hands visible = nitro
    gestureNitro = results.landmarks.length >= 2 &&
        nitro > 0;

    $("gesture-text").textContent =
        gestureBrake ? "Braking" :
        gestureNitro ? "NITRO ACTIVATED" :
        gestureAccelerate ? "Accelerating" :
        "Hand detected";
}

function updateGestureControls() {
    if (controlMode !== "gesture") return;

    processGestures();

    accelerating = gestureAccelerate;
    braking = gestureBrake;
    steering = gestureSteer;
    nitroActive = gestureNitro;
}

/* ==========================================
   CAR MOVEMENT
========================================== */

function updatePlayer(delta) {
    const acceleration = 32;
    const brakePower = 60;
    const maxSpeed = 180;

    if (accelerating) {
        speed += acceleration * delta;
    } else {
        speed -= 12 * delta;
    }

    if (braking) {
        speed -= brakePower * delta;
    }

    if (nitroActive && nitro > 0 && speed > 0) {
        speed += 50 * delta;
        nitro -= 28 * delta;
    } else {
        nitro += 8 * delta;
    }

    speed = THREE.MathUtils.clamp(speed, 0, maxSpeed);
    nitro = THREE.MathUtils.clamp(nitro, 0, 100);

    const movement = steering * 8 * delta;

    player.position.x += movement * (0.4 + speed / maxSpeed);

    player.position.x = THREE.MathUtils.clamp(
        player.position.x,
        -5.4,
        5.4
    );

    player.rotation.z = THREE.MathUtils.lerp(
        player.rotation.z,
        -steering * 0.15,
        0.1
    );

    player.userData.wheels.forEach(wheel => {
        wheel.rotation.x -= speed * delta * 0.08;
    });

    distance += speed * delta / 3.6;
    score += Math.floor(speed * delta * 0.4);

    $("speed").textContent = Math.floor(speed);
    $("score").textContent = score;
    $("nitro-fill").style.width = nitro + "%";
}

/* ==========================================
   CAMERA SYSTEM
========================================== */

function updateCamera() {
    if (cameraMode === "behind") {
        const target = new THREE.Vector3(
            player.position.x * 0.6,
            5,
            15
        );

        camera.position.lerp(target, 0.08);

        camera.lookAt(
            player.position.x,
            1,
            -7
        );

    } else {
        const target = new THREE.Vector3(
            player.position.x,
            2.5,
            5
        );

        camera.position.lerp(target, 0.12);

        camera.lookAt(
            player.position.x,
            2.2,
            -30
        );
    }
}

function updateCameraButton() {
    $("camera-btn").textContent =
        cameraMode === "behind"
            ? "CAMERA: BEHIND"
            : "CAMERA: DRIVER";
}

/* ==========================================
   ROAD ANIMATION
========================================== */

function updateWorld(delta) {
    const movement = speed * delta * 0.12;

    roadLines.forEach(line => {
        line.position.z += movement;

        if (line.position.z > 10) {
            line.position.z -= 300;
        }
    });

    buildings.forEach(building => {
        building.position.z += movement;

        if (building.position.z > 15) {
            building.position.z -= 405;
        }
    });
}

/* ==========================================
   TRAFFIC AND COINS
========================================== */

let obstacleTimer = 0;
let coinTimer = 0;

function updateObjects(delta) {
    const movement = speed * delta * 0.12;

    obstacleTimer += delta;
    coinTimer += delta;

    if (obstacleTimer > 1.8 && speed > 20) {
        createObstacle();
        obstacleTimer = 0;
    }

    if (coinTimer > 1.2 && speed > 10) {
        createCoin();
        coinTimer = 0;
    }

    obstacles.forEach((obstacle, index) => {
        obstacle.position.z += movement;

        if (
            Math.abs(obstacle.position.x - player.position.x) < 1.8 &&
            Math.abs(obstacle.position.z - player.position.z) < 2.7
        ) {
            speed *= 0.45;
            scene.remove(obstacle);
            obstacles.splice(index, 1);
        }

        if (obstacle.position.z > 20) {
            scene.remove(obstacle);
            obstacles.splice(index, 1);
        }
    });

    coinObjects.forEach((coin, index) => {
        coin.position.z += movement;
        coin.rotation.y += delta * 4;

        if (
            Math.abs(coin.position.x - player.position.x) < 1.8 &&
            Math.abs(coin.position.z - player.position.z) < 2.5
        ) {
            coins++;
            score += 100;

            $("coins").textContent = coins;

            scene.remove(coin);
            coinObjects.splice(index, 1);
        }

        if (coin.position.z > 20) {
            scene.remove(coin);
            coinObjects.splice(index, 1);
        }
    });
}

/* ==========================================
   PAUSE AND GAME OVER
========================================== */

function pauseGame() {
    if (!gameRunning || gameOver) return;

    paused = true;
    $("pause-menu").classList.remove("hidden");
}

function resumeGame() {
    paused = false;
    $("pause-menu").classList.add("hidden");
    clock.start();
}

function finishRace() {
    gameRunning = false;
    gameOver = true;

    stopWebcam();

    $("game-hud").classList.add("hidden");
    $("game-over").classList.remove("hidden");

    $("final-score").textContent = score;
    $("final-coins").textContent = coins;
}

/* ==========================================
   CONTROL MODE
========================================== */

async function toggleControls() {
    if (controlMode === "keyboard") {
        controlMode = "gesture";

        $("control-btn").textContent = "CONTROL: GESTURE";
        $("gesture-status").style.display = "block";

        await startWebcam();

    } else {
        controlMode = "keyboard";

        stopWebcam();

        $("control-btn").textContent = "CONTROL: KEYBOARD";
        $("gesture-text").textContent = "Keyboard Mode";
    }
}

/* ==========================================
   BUTTON EVENTS
========================================== */

function bindButtons() {
    $("start-btn").addEventListener("click", startRace);

    $("garage-btn").addEventListener("click", () => {
        $("main-menu").classList.add("hidden");
        $("garage-menu").classList.remove("hidden");
    });

    $("garage-back-btn").addEventListener("click", () => {
        $("garage-menu").classList.add("hidden");
        $("main-menu").classList.remove("hidden");
    });

    $("car-select").addEventListener("change", e => {
        selectedCar = e.target.value;
        createPlayer();
    });

    $("camera-btn").addEventListener("click", () => {
        cameraMode =
            cameraMode === "behind" ? "driver" : "behind";

        updateCameraButton();
    });

    $("control-btn").addEventListener("click", toggleControls);

    $("nitro-btn").addEventListener("pointerdown", () => {
        nitroActive = true;
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach(event => {
        $("nitro-btn").addEventListener(event, () => {
            nitroActive = false;
        });
    });

    $("pause-btn").addEventListener("click", pauseGame);
    $("resume-btn").addEventListener("click", resumeGame);

    $("restart-btn").addEventListener("click", startRace);

    $("home-btn").addEventListener("click", showMainMenu);
    $("menu-btn").addEventListener("click", showMainMenu);

    $("race-again-btn").addEventListener("click", startRace);

    bindMobileControls();
}

function showMainMenu() {
    gameRunning = false;
    paused = false;
    gameOver = false;

    stopWebcam();

    $("game-hud").classList.add("hidden");
    $("pause-menu").classList.add("hidden");
    $("game-over").classList.add("hidden");
    $("main-menu").classList.remove("hidden");
}

/* ==========================================
   RESIZE
========================================== */

function resize() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ==========================================
   MAIN GAME LOOP
========================================== */

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (gameRunning && !paused && !gameOver) {

        updateKeyboard();
        updateGestureControls();

        updatePlayer(delta);
        updateWorld(delta);
        updateObjects(delta);
        updateCamera();

        if (distance >= MAX_DISTANCE) {
            finishRace();
        }
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

/* ==========================================
   START APPLICATION
========================================== */

init();
