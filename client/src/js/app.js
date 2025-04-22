/**
 * Main application entry point
 */
import { Engine } from '../engine/core/Engine.js';

// Application class
class BlockWorldApp {
    constructor() {
        this.engine = new Engine();
    }
    
    /**
     * Initialize the application
     */
    init() {
        // Initialize the engine
        this.engine.init();
        console.log('Block World Arena application initialized');
    }
    
    /**
     * Start the application
     */
    start() {
        // Add any application-specific objects or scenes here
        
        // Start the engine
        this.engine.start();
        console.log('Block World Arena application started');
    }
}

// Create and start the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new BlockWorldApp();
    app.init();
    app.start();
}); 