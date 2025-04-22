/**
 * Core Engine class that handles the main ThreeJS setup
 */
export class Engine {
    constructor() {
        // Core ThreeJS components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Animation frame ID for cancellation if needed
        this.animationId = null;
        
        // Clock for handling time-based animations
        this.clock = null;
    }

    /**
     * Initialize the engine
     */
    init() {
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create the camera
        this.camera = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            1000 // Far plane
        );
        this.camera.position.z = 5;
        
        // Create the renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // Initialize clock for animations
        this.clock = new THREE.Clock();
        
        // Add window resize listener
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log('ThreeJS engine initialized');
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Get elapsed time
        const delta = this.clock.getDelta();
        
        // Update any animations or physics here
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Start the engine
     */
    start() {
        // Start the animation loop
        this.animate();
        console.log('ThreeJS engine started');
    }
    
    /**
     * Stop the engine
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
} 