import * as THREE from 'three';

export class Input {
  constructor(private camera: THREE.Camera) {}

  public update(): void {
    // TODO: Handle keyboard and mouse input
  }

  public getCamera(): THREE.Camera {
    return this.camera;
  }
} 