import {
  InstancedMesh,
  BoxGeometry,
  Matrix4,
  MeshStandardMaterial,
  DynamicDrawUsage
} from 'three';

export class Chunk {
  public mesh: InstancedMesh;

  constructor(public key: string) {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({ color: 0x888888 });
    this.mesh = new InstancedMesh(geometry, material, 256);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  }

  public async generateFlatSurface(): Promise<void> {
    let index = 0;
    const matrix = new Matrix4();
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        matrix.setPosition(x, 0, z);
        this.mesh.setMatrixAt(index++, matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
} 