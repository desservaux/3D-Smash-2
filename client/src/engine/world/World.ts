import { Chunk } from './Chunk';
import { InstancedMesh } from 'three';

export class World {
  private chunks = new Map<string, Chunk>();

  public async loadInitialChunks(): Promise<void> {
    const size = 10;
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        const key = `${x},0,${z}`;
        const chunk = new Chunk(key);
        await chunk.generateFlatSurface();
        this.chunks.set(key, chunk);
      }
    }
  }

  public update(): void {
    // TODO: handle dynamic chunk loading/unloading
  }

  public getChunkMeshes(): InstancedMesh[] {
    return Array.from(this.chunks.values()).map(chunk => chunk.mesh);
  }
} 