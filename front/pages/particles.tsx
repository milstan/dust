import { useEffect, RefObject } from "react";
import * as THREE from "three";

let hasScrollBehavior: boolean = true;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let particleSystem: THREE.Points;
let backgroundColor = 0x1e293b;
let colorsArray = [
  0x059669, 0x4ade80, 0xf87171, 0xf9a8d4, 0x7dd3fc, 0x3b82f6, 0xfbbf24,
];

let originalSpread = 25; // the random position of Particules at start
let explode = false; // whether to explode the particles
let numParticles = 10000; // number of particles
let particleSize = 0.015; // Size of the particles
let geometricObjectSize = 1.25;
let rotationActive = true; // Activate the rotation of the scene
let speed = 0.1;
let postExplosionSpeed = 0.03;
// Center of the animation
let sceneFocusX = 0;
let sceneFocusY = 0;
let sceneFocusZ = 0;
let currentShape = 0; // 0 = cube, 1 = sphere, etc...
let totalShapes = 4;
let targetPositions: { x: number; y: number; z: number }[] = []; // Array to hold the target positions of all particles for each shape

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;
  camera.position.y = 0;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("canvas-container")!.appendChild(renderer.domElement);

  let geometry = new THREE.BufferGeometry();
  let vertices = [];
  let colors = [];
  for (let i = 0; i < numParticles; i++) {
    vertices.push(
      THREE.MathUtils.randFloatSpread(originalSpread), // x
      THREE.MathUtils.randFloatSpread(originalSpread), // y
      THREE.MathUtils.randFloatSpread(originalSpread) // z
    );
    let color = new THREE.Color(
      colorsArray[Math.floor(Math.random() * colorsArray.length)]
    );
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  let material = new THREE.PointsMaterial({
    size: particleSize, // Particles size
    vertexColors: true,
  });

  particleSystem = new THREE.Points(geometry, material);
  particleSystem.rotation.x = 0.7;
  particleSystem.rotation.y = -0.3;
  particleSystem.rotation.z = 0;
  scene.add(particleSystem);

  // controls = new OrbitControls(camera, renderer.domElement);
  // controls.addEventListener("change", function () {
  //   isDragging = true;
  // });
  // controls.enableDamping = true; // enable inertia
  // controls.dampingFactor = 0.1; // the inertia factor
}

function onWindowResize() {
  // Update camera aspect ratio
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Update renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeydown(event: KeyboardEvent) {
  let previousShape = currentShape;

  switch (event.keyCode) {
    case 37: // left arrow key
      currentShape = (currentShape - 1 + totalShapes) % totalShapes;
      break;
    case 39: // right arrow key
      currentShape = (currentShape + 1) % totalShapes;
      break;
  }

  if (currentShape != previousShape) {
    calculateTargetPositions(); // Only calculate target positions when the shape changes
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (rotationActive) {
    particleSystem.rotation.x += 0.0002;
    particleSystem.rotation.y += 0.00005;
    particleSystem.rotation.z += 0.0002;
  }
  if (!explode) {
    animateImplode();
  } else {
    animateExplode();
  }
  particleSystem.geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}

function animateImplode() {
  let positions = particleSystem.geometry.attributes.position.array;
  let allParticlesInside = true; // initially assume that all particles are inside the sphere, only used to start the original explosion

  for (let i = 0; i < positions.length; i += 3) {
    let targetPositionX = sceneFocusX;
    let targetPositionY = sceneFocusY;
    let targetPositionZ = sceneFocusZ;
    let currentPositionX = positions[i];
    let currentPositionY = positions[i + 1];
    let currentPositionZ = positions[i + 2];
    let distanceX = currentPositionX - targetPositionX;
    let distanceY = currentPositionY - targetPositionY;
    let distanceZ = currentPositionZ - targetPositionZ;

    let distance3D = Math.sqrt(
      distanceX * distanceX + distanceY * distanceY + distanceZ * distanceZ
    );

    if (distance3D < 0.2) {
      positions[i] = targetPositionX;
      positions[i + 1] = targetPositionY;
      positions[i + 2] = targetPositionZ;
    } else {
      allParticlesInside = false;

      let force =
        (distance3D * speed) / (distance3D * distance3D + Number.EPSILON); // Movement speed

      positions[i] -= force * distanceX;
      positions[i + 1] -= force * distanceY;
      positions[i + 2] -= force * distanceZ;
    }
  }

  if (allParticlesInside && !explode) {
    explode = true;
    speed = postExplosionSpeed;
  }
}

function animateExplode() {
  let positions = particleSystem.geometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    let targetPosition = targetPositions[i / 3]; // Retrieve the pre-calculated target position for this particle

    let currentPositionX = positions[i];
    let currentPositionY = positions[i + 1];
    let currentPositionZ = positions[i + 2];
    let distanceX = targetPosition.x - currentPositionX;
    let distanceY = targetPosition.y - currentPositionY;
    let distanceZ = targetPosition.z - currentPositionZ;

    let distance3D = Math.sqrt(
      distanceX * distanceX + distanceY * distanceY + distanceZ * distanceZ
    );

    if (distance3D > speed) {
      let force =
        (distance3D * speed) / (distance3D * distance3D + Number.EPSILON); // Movement speed
      positions[i] += force * distanceX;
      positions[i + 1] += force * distanceY;
      positions[i + 2] += force * distanceZ;
    } else {
      positions[i] = targetPosition.x;
      positions[i + 1] = targetPosition.y;
      positions[i + 2] = targetPosition.z;
    }
  }
}

function calculateTargetPositions() {
  targetPositions = []; // Reset the target positions

  for (let i = 0; i < numParticles; i++) {
    let targetPositionX = 0,
      targetPositionY = 0,
      targetPositionZ = 0,
      ix,
      iy,
      iz,
      phi,
      theta,
      radius;

    switch (currentShape) {
      case 0: // grid
        let gridSize = 16;
        let gridNum = 48;
        let gridSpacing = gridSize / gridNum; // spacing between particles in the grid

        // Calculate indices along x and y axis
        let gridX = i % gridNum;
        let gridY = Math.floor(i / 3 / gridNum) % gridNum;

        // Calculate positions so that the grid is centered at the origin
        targetPositionX = gridX * gridSpacing - gridSize / 2 + gridSpacing / 2;
        targetPositionY = gridY * gridSpacing - gridSize / 2 + gridSpacing / 2;
        targetPositionZ = 0; // flat grid on the x/y plane
        //console.log('targetPositionX', targetPositionX, 'targetPositionY', targetPositionY, 'targetPositionZ', targetPositionZ);
        break;
      case 1: // sphere
        radius = geometricObjectSize * 1.5;
        phi = Math.acos(-1 + (2 * i) / numParticles); // angle for Y
        theta = Math.sqrt(numParticles * Math.PI) * phi; // angle for X and Z

        targetPositionX = radius * Math.cos(theta) * Math.sin(phi);
        targetPositionY = radius * Math.sin(theta) * Math.sin(phi);
        targetPositionZ = radius * Math.cos(phi);
        break;
      case 2: // Bigger sphere
        radius = geometricObjectSize * 4;
        phi = Math.acos(-1 + (2 * i) / numParticles); // angle for Y
        theta = Math.sqrt(numParticles * Math.PI) * phi; // angle for X and Z

        targetPositionX = radius * Math.cos(theta) * Math.sin(phi);
        targetPositionY = radius * Math.sin(theta) * Math.sin(phi);
        targetPositionZ = radius * Math.cos(phi);
        break;
      case 3: // cube
        let cubeSize = geometricObjectSize * 12; // size of the cube
        let particlesPerSide = Math.cbrt(numParticles); // number of particles per side of the cube

        ix = i % particlesPerSide; // index along x-axis
        iy = Math.floor((i / particlesPerSide) % particlesPerSide); // index along y-axis
        iz = Math.floor(i / (particlesPerSide * particlesPerSide)); // index along z-axis

        targetPositionX = (ix * cubeSize) / particlesPerSide - cubeSize / 2;
        targetPositionY = (iy * cubeSize) / particlesPerSide - cubeSize / 2;
        targetPositionZ = (iz * cubeSize) / particlesPerSide - cubeSize / 2;
        break;
    }

    targetPositions.push({
      x: targetPositionX + sceneFocusX,
      y: targetPositionY + sceneFocusY,
      z: targetPositionZ + sceneFocusZ,
    });
  }
  let aDuration, RotateX, RotateY;
  if (!explode) {
    aDuration = 4.5;
    RotateX = 4;
    RotateY = 2;
  } else {
    aDuration = 1.5;
    RotateX = 2;
    RotateY = 0;
  }
}

type ParticulesComponentProps = {
  scrollRef1: RefObject<HTMLDivElement>;
  scrollRef2: RefObject<HTMLDivElement>;
  scrollRef3: RefObject<HTMLDivElement>;
};

export default function Particules({
  scrollRef1,
  scrollRef2,
  scrollRef3,
}: ParticulesComponentProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      init();
      calculateTargetPositions();
      animate();
    }

    const onScroll = (event: Event) => {
      const offset = window.innerHeight / 2;
      const yPositions = [
        0,
        scrollRef1.current?.offsetTop || 0,
        scrollRef2.current?.offsetTop || 0,
        scrollRef3.current?.offsetTop || 0,
      ];

      const scrollPosition =
        window.scrollY || document.documentElement.scrollTop;

      for (let i = 0; i < totalShapes; i++) {
        if (
          scrollPosition + offset >= yPositions[i] &&
          (i === totalShapes - 1 || scrollPosition + offset < yPositions[i + 1])
        ) {
          if (currentShape !== i) {
            currentShape = i;
            calculateTargetPositions();
          }
          break;
        }
      }

      // console.log(
      //   "currentShape",
      //   currentShape,
      //   "window.scrollY",
      //   window.scrollY,
      //   "window.innerHeight",
      //   window.innerHeight,
      //   "yPositions",
      //   yPositions
      // );
    };

    window.addEventListener("keydown", onKeydown, false);
    window.addEventListener("resize", onWindowResize, false);
    if (hasScrollBehavior) {
      window.addEventListener("scroll", onScroll, false);
    }

    return () => {
      window.removeEventListener("keydown", onKeydown, false);
      window.removeEventListener("resize", onWindowResize, false);
      //window.removeEventListener("scroll", onScroll, false);
      renderer.dispose();
    };
  }, []);

  return (
    <div id="canvas-container">
      {/* Canvas will be appended here by Three.js */}
    </div>
  );
}
