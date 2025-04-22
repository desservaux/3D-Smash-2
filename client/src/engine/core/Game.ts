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

  private setupEventListeners(): void {
    // TODO: attach input callbacks
  }

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