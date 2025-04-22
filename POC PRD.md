# Product Requirements Document: Block World Arena

## 1. Overview
Block World Arena is a multiplayer voxel-based game built with ThreeJS that allows players to explore, build, and interact in a confined 3D arena made of blocks. Players can modify the environment by adding and removing blocks, and interact with other players in real-time. The arena has defined boundaries, beyond which players fall into the void and respawn.

## 2. Core Features

### 2.1 World Design
- Fixed-size arena with clearly defined boundaries
- Void areas around the edges where players can fall and die/respawn
- Simple terrain with varied elevation and features
- Basic lighting system
- Optional day/night cycle

### 2.2 Player Controls
- First-person perspective with optional third-person toggle
- WASD movement with space for jumping
- Mouse-controlled camera
- Block placement/removal with mouse clicks (left-click to break, right-click to place)
- Simple physics (gravity, collision detection)
- Inventory system for collecting and storing blocks
- Death and respawn mechanism when falling into the void

### 2.3 Multiplayer Functionality
- Real-time player synchronization (position, rotation, actions)
- Up to 8 players per arena initially
- Player avatars with basic customization
- Text chat system
- World state persistence (saving/loading world modifications)

### 2.4 Block Types & Interactions
- 5-10 block types at launch (dirt, stone, grass, wood, etc.)
- Different physical properties (some blocks fall with gravity, some float)
- Different breaking speeds for different block types
- Basic crafting system (optional for MVP)

## 3. Technical Requirements

### 3.1 Performance Targets
- 60 FPS on mid-range hardware
- Support for desktop browsers (Chrome, Firefox, Safari, Edge)
- Responsive design supporting various screen sizes
- Maximum load time of 3 seconds for arena loading

### 3.2 Network Requirements
- WebSocket-based real-time communication
- Efficient data synchronization to minimize bandwidth usage
- Latency compensation techniques
- Graceful handling of connection issues

### 3.3 Storage
- Client-side caching for improved performance
- Server-side world state persistence
- User session management

## 4. Implementation Phases

### 4.1 Phase 1 (MVP)
- Basic arena generation with flat terrain
- Void boundaries implementation
- Player movement and camera controls
- Block placement and removal
- Collision detection
- Death and respawn mechanics
- Single-player mode working fully

### 4.2 Phase 2
- Multiplayer connectivity
- Basic player synchronization
- Text chat
- 5 block types with different properties
- Basic world persistence

### 4.3 Phase 3
- Enhanced arena design with varied terrain
- More sophisticated lighting
- Improved multiplayer features (more players, better sync)
- Additional block types and interactions
- Basic crafting system (if decided to include)

### 4.4 Future Enhancements
- Mobile support
- Player statistics and leaderboards
- More complex arenas with special features
- Game modes (building challenges, PvP, etc.)

## 5. User Experience Goals
- Intuitive controls similar to existing voxel games
- Fast and responsive interaction with the world
- Seamless multiplayer experience with minimal latency
- Visually appealing block aesthetic while maintaining performance
- Clear feedback for all player actions

## 6. Success Metrics
- Average session length > 15 minutes
- Player retention rate > 30% after 7 days
- Concurrent players supported without performance degradation
- < 100ms average response time for player actions

## 7. POC Build Guide

### 7.1 Directory & File Structure
- **client/src/index.ts**: Entry point for initializing ThreeJS scene and game loop.
- **client/src/engine/core/Game.ts**: Core game class managing initialization, loop, and resource loading.
- **client/src/engine/core/Input.ts**: Handles keyboard and mouse input and camera controls.
- **client/src/engine/world/World.ts**: Generates and manages voxel chunks.
- **client/src/engine/world/Chunk.ts**: Defines chunk geometry and instanced mesh handling.
- **client/src/engine/physics/Physics.ts**: Implements gravity and collision detection.
- **client/src/engine/rendering/Renderer.ts**: Wraps ThreeJS WebGLRenderer, sets up scene, camera, lighting.
- **client/src/entities/Player.ts**: Player movement, state updates, and network synchronization.
- **shared/types/index.ts**: Shared TypeScript interfaces and constants for both client and server.
- **server/src/index.ts**: Sets up Express/Fastify server and WebSocket service.
- **server/src/networking/SocketServer.ts**: Manages WebSocket connections and messaging.
- **server/src/world/ChunkService.ts**: Handles server-side chunk generation and storage.
- **server/src/services/WorldState.ts**: Persists and loads world state from Supabase.

### 7.2 Build and Run (Replit)
In the Replit shell:
```bash
npm install
npm run dev
```

### 7.3 Core Code Prototypes

#### client/src/engine/core/Game.ts
```ts
import { Renderer } from '../rendering/Renderer';
import { World } from '../world/World';
import { Physics } from '../physics/Physics';
import { Input } from './Input';

export class Game {
  private renderer: Renderer;
  private world: World;
  private physics: Physics;
  private input: Input;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.world = new World();
    this.physics = new Physics(this.world);
    this.input = new Input(this.renderer.camera);
    this.setupEventListeners();
  }

  private setupEventListeners(): void { /* attach input callbacks */ }

  public async init(): Promise<void> {
    await this.world.loadInitialChunks();
    this.loop();
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    this.input.update();
    this.physics.update();
    this.world.update();
    this.renderer.render(this.world, this.input.getCamera());
  };
}
```

#### client/src/engine/world/World.ts
```ts
import { Chunk } from './Chunk';

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

  public update(): void { /* handle dynamic chunk loading/unloading */ }
}
```

#### client/src/engine/world/Chunk.ts
```ts
import * as THREE from 'three';

export class Chunk {
  public mesh: THREE.InstancedMesh;

  constructor(public key: string) {
    const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    this.mesh = new THREE.InstancedMesh(geometry, material, 256);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  public async generateFlatSurface(): Promise<void> {
    let index = 0;
    const matrix = new THREE.Matrix4();
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        matrix.setPosition(x, 0, z);
        this.mesh.setMatrixAt(index++, matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
```

### 7.4 Next Steps
- Implement collision detection in `Physics.ts`.
- Integrate WebSocket messaging in `SocketServer.ts` and `Player.ts`.
- Add client-side prediction and server reconciliation.

<!-- End of build guide -->
