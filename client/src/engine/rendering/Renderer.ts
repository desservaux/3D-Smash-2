import * as THREE from 'three';
import { World } from '../world/World';

export class Renderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 10, 20);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
  }

  public render(world: World, camera: THREE.Camera): void {
    // Add world chunks to scene if not already present
    const chunkMeshes = world.getChunkMeshes();
    for (const mesh of chunkMeshes) {
      if (!this.scene.children.includes(mesh)) {
        this.scene.add(mesh);
      }
    }
    this.renderer.render(this.scene, camera);
  }
} 