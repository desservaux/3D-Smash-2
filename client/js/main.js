import * as THREE from 'three';

let scene, camera, renderer, cube;

function init() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background

    // 2. Camera
    const container = document.getElementById('game-container');
    camera = new THREE.PerspectiveCamera(
        75, // fov
        container.clientWidth / container.clientHeight, // aspect ratio
        0.1, // near plane
        1000 // far plane
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 5);
    scene.add(dirLight);

    // 5. Basic Objects (Example: Cube and Plane)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green cube
    cube = new THREE.Mesh(geometry, material);
    cube.position.y = 0.5;
    scene.add(cube);

    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide }); // Grey plane
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    scene.add(plane);

    // 6. Window Resize Listener
    window.addEventListener('resize', onWindowResize, false);

    console.log('Basic Three.js Scene Initialized for POC');
}

function onWindowResize() {
    const container = document.getElementById('game-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Simple animation example
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

// --- Start ---
document.addEventListener('DOMContentLoaded', () => {
    init();
    animate();

    // --- Optional: Basic WebSocket Connection ---
    const socket = new WebSocket(`ws://${window.location.host}`); // Connect to the same host

    socket.addEventListener('open', (event) => {
        console.log('WebSocket Connected');
        socket.send('Hello Server from Client!');
    });

    socket.addEventListener('message', (event) => {
        console.log('Message from server: ', event.data);
    });

     socket.addEventListener('close', (event) => {
        console.log('WebSocket Disconnected');
    });

     socket.addEventListener('error', (event) => {
        console.error('WebSocket Error:', event);
    });
});