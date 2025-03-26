/**
 * Main entry point for 3D SMASH Game
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // Verify that required libraries are loaded
    if (typeof THREE === 'undefined') {
        console.error('Error: Three.js library not loaded!');
        alert('Error: Three.js library not loaded. Please check your internet connection and try again.');
        return;
    }
    
    if (typeof CANNON === 'undefined') {
        console.error('Error: Cannon.js library not loaded!');
        alert('Error: Cannon.js library not loaded. Please check your internet connection and try again.');
        return;
    }
    
    try {
        // Initialize the game
        Game.init();
        
        // Add canvas click handler to activate pointer lock
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('click', function() {
                if (Game.firstPersonMode && Game.controls && !Game.controls.isLocked) {
                    console.log('Canvas clicked, requesting pointer lock');
                    Game.controls.lock();
                }
            });
        }
        
        // Start the game loop
        Game.start();
        
        console.log('Game started successfully');
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Error starting game: ' + error.message);
    }
}); 