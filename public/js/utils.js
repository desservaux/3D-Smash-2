/**
 * Utility functions for 3D SMASH Game
 */

const Utils = {
    // Convert degrees to radians
    degToRad: function(degrees) {
        return degrees * Math.PI / 180;
    },
    
    // Random integer between min and max (inclusive)
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    // Random color in hex format
    randomColor: function() {
        return Math.floor(Math.random() * 0xffffff);
    },
    
    // Check if the player is out of bounds (off the island)
    isOutOfBounds: function(position, islandSize) {
        const halfSize = islandSize / 2;
        return Math.abs(position.x) > halfSize || 
               position.y < -10 ||  // Fell into the void
               Math.abs(position.z) > halfSize;
    },
    
    // Linear interpolation
    lerp: function(start, end, t) {
        return start * (1 - t) + end * t;
    },
    
    // Clamp value between min and max
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}; 