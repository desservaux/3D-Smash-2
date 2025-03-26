/**
 * Main entry point for 3D SMASH Game
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');

    if (typeof THREE === 'undefined') {
        console.error('Error: Three.js library not loaded!');
        alert('Error: Three.js library not loaded.'); return;
    }
    if (typeof CANNON === 'undefined') {
        console.error('Error: Cannon.js library not loaded!');
        alert('Error: Cannon.js library not loaded.'); return;
    }

    try {
        Game.init(); // Initialize the game



        Game.start(); // Start the game loop

        console.log('Game started successfully');
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Error starting game: ' + error.message + '\n\nCheck console for details.');
    }
});