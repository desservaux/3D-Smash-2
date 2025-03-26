# Project Structure

This document outlines the structure and organization of the 3D SMASH Game POC.

## Directory Structure

```
root/
├── public/                  # Static files served to the client
│   ├── css/                 # CSS stylesheets
│   │   └── style.css        # Main stylesheet
│   ├── js/                  # JavaScript files
│   │   ├── utils.js         # Utility functions
│   │   ├── textures.js      # Texture management
│   │   ├── island.js        # Island generation
│   │   ├── character.js     # Character controller
│   │   ├── physics.js       # Physics handling
│   │   ├── input.js         # Input handling
│   │   ├── game.js          # Main game controller
│   │   └── main.js          # Entry point
│   ├── textures/            # Texture assets (generated procedurally in this POC)
│   └── index.html           # Main HTML file
├── index.js                 # Node.js server
├── README.md                # Project documentation
└── PROJECT_STRUCTURE.md     # This file
```

## Component Overview

### Server-Side

- **index.js**: A simple Node.js HTTP server that serves static files from the public directory.

### Client-Side

- **index.html**: The main HTML file that loads all scripts and contains the game canvas.

- **style.css**: Contains styling for the game UI elements.

- **utils.js**: Contains utility functions used throughout the game.

- **textures.js**: Manages texture generation and loading for the game.

- **island.js**: Responsible for creating and managing the floating island arena.

- **character.js**: Controls the player character's movement, jumping, and knockback capabilities.
  - Implements a reliable jumping system with ground detection
  - Supports double-jumping when in the air
  - Uses direct velocity setting for more consistent jumping behavior
  - Features multiple ground detection methods (ray casting, velocity check, position check)
  - Includes auto-recovery mechanisms to prevent getting stuck

- **physics.js**: Handles physics simulations using Cannon.js, including collision detection.

- **input.js**: Manages user input handling (keyboard and mouse).
  - Features robust space key detection with multiple fallback mechanisms
  - Uses dedicated flags to track jump input state (spaceJustPressed, spacePressedThisFrame)
  - Prevents repeated jumps with input handling logic
  - Includes detailed logging for debugging input issues

- **game.js**: The main game controller that coordinates all game components.
  - Implements redundant jump triggering mechanisms
  - Provides detailed debug info through the debug panel
  - Coordinates between input, character, and physics systems

- **main.js**: The entry point that initializes the game.

## How It Works

1. The server (index.js) starts and serves the static files.

2. When a client loads the game in the browser, the main.js script initializes the game.

3. Game.init() sets up the Three.js scene, camera, renderer, and initializes all game components.

4. The game loop begins, handling:
   - User input processing
   - Physics updates
   - Game object updates
   - Rendering

5. The player can move around the island, jump, double-jump, and apply knockback to a test object.

### Jump System Implementation

The game uses a multi-layered approach to ensure reliable jumping:

1. **Input Detection**:
   - Multiple detection methods for the Space key (event-based and per-frame checks)
   - Flags to prevent repeated jumps when holding the key
   - Random chance jump trigger as a fallback when holding Space

2. **Ground Detection**:
   - Ray casting from the character to detect ground beneath
   - Velocity-based detection for when the character is nearly stationary
   - Position-based failsafe for when near the ground level
   - Force reset mechanisms to prevent the character getting stuck

3. **Jump Physics**:
   - Direct velocity setting rather than impulses for more consistent behavior
   - Separate handling for first jump and double jump
   - Comprehensive logging to diagnose issues

## Technical Design

### Rendering

The game uses Three.js for rendering the 3D scene, with a perspective camera that follows the player character.

### Physics

Cannon.js provides the physics simulation, including:
- Rigid body dynamics
- Collision detection
- Gravity
- Knockback forces

### Input Handling

The game captures keyboard input for movement and jumping, and mouse input for applying knockback. The input system includes:
- Key state tracking
- Mouse position and movement tracking
- Jump input detection with multiple methods
- Detailed logging for troubleshooting

### Game Loop

The game uses requestAnimationFrame for the main loop, with delta time calculations to ensure consistent gameplay regardless of frame rate.

## Future Expansion

The modular structure makes it easy to add new features in future phases:

1. Multiplayer support can be implemented by extending the server with WebSockets.
2. New game objects can be added by creating new modules similar to the existing ones.
3. UI elements can be expanded in the HTML/CSS files. 