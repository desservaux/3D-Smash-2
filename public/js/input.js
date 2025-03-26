/**
 * Input handling for 3D SMASH Game
 */

const Input = {
    keys: {},
    previousKeys: {}, // Add tracking for previous key states
    mousePosition: { x: 0, y: 0 },
    previousMousePosition: { x: 0, y: 0 },
    mouseDelta: { x: 0, y: 0 },
    isMouseDown: false,
    rightMouseDown: false,
    mouseSensitivity: 0.002, // Adjusted for Minecraft-like feel
    pointerLock: false, // Track if pointer is locked for first-person view
    pendingPointerLock: false, // Track if we're waiting for pointer lock
    pointerLockTimeout: null, // Timeout for pointer lock request
    lastKeyPressTime: 0,
    spaceJustPressed: false, // Dedicated flag for space bar
    spacePressedThisFrame: false, // Additional flag for space key handling
    spaceWasHandled: false, // Track if space press was already handled
    lastRotation: { x: 0, y: 0 }, // Store last rotation for smoothing
    
    // Initialize input event listeners
    init: function() {
        console.log('Initializing input system');
        
        // Initialize keys object
        this.keys = {};
        
        // Setup special jump flags
        this.spaceJustPressed = false;
        this.spacePressedThisFrame = false;
        this.spaceWasHandled = false;
        
        // Key pressed event
        window.addEventListener('keydown', (event) => {
            // Store key state
            this.keys[event.code] = true;
            this.onKeyPressed(event.code);
            
            // Special handling for Space key (jump)
            if (event.code === 'Space' && !this.spaceJustPressed) {
                this.spaceJustPressed = true;
                console.log("Space key pressed - setting spaceJustPressed flag");
            }
            
            // Special handling for P key (toggle first person)
            if (event.code === 'KeyP') {
                this.toggleFirstPersonMode();
            }
            
            // Special handling for Escape key (exit pointer lock)
            if (event.code === 'Escape' && this.pointerLock) {
                this.exitPointerLock();
            }
            
            // Debug key logging
            console.log('Keydown:', event.code);
        });
        
        // Key released event
        window.addEventListener('keyup', (event) => {
            // Mark key as released
            this.keys[event.code] = false;
            
            // Special handling for Space key (jump)
            if (event.code === 'Space') {
                this.spaceJustPressed = false;
                this.spaceWasHandled = false;
                console.log("Space key released - resetting flags");
            }
            
            // Debug key logging
            console.log('Keyup:', event.code);
        });
        
        // Left mouse button down event
        window.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left button
                this.isMouseDown = true;
                
                // Request pointer lock on click for first-person mode
                if (Game.firstPersonMode && !this.pointerLock) {
                    this.requestPointerLock();
                }
            } else if (event.button === 2) { // Right button
                this.rightMouseDown = true;
            }
        });
        
        // Mouse button up event
        window.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Left button
                this.isMouseDown = false;
            } else if (event.button === 2) { // Right button
                this.rightMouseDown = false;
            }
        });
        
        // Mouse move event for camera control
        window.addEventListener('mousemove', (event) => {
            // For pointer lock (first-person) movement
            if (this.pointerLock) {
                // Use movementX and movementY for pointer lock with sensitivity adjustment
                const sensitivity = this.mouseSensitivity;
                
                // Store these deltas for the current frame
                if (event.movementX !== undefined && event.movementY !== undefined) {
                    this.mouseDelta.x = event.movementX * sensitivity;
                    this.mouseDelta.y = event.movementY * sensitivity;
                    
                    console.log("Pointer lock mouse move:",
                        "movementX/Y:", event.movementX, event.movementY,
                        "delta after sensitivity:", this.mouseDelta.x, this.mouseDelta.y);
                }
            } 
            // For normal movement without pointer lock (third-person mode)
            else {
                this.previousMousePosition.x = this.mousePosition.x;
                this.previousMousePosition.y = this.mousePosition.y;
                
                this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
                this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
                
                // Calculate mouse movement delta
                this.mouseDelta.x = this.mousePosition.x - this.previousMousePosition.x;
                this.mouseDelta.y = this.mousePosition.y - this.previousMousePosition.y;
                
                console.log("Regular mouse move - delta:", this.mouseDelta.x, this.mouseDelta.y);
            }
        });
        
        // Pointer lock change event
        document.addEventListener('pointerlockchange', () => {
            const wasLocked = this.pointerLock;
            this.pointerLock = document.pointerLockElement === document.getElementById('game-canvas');
            this.pendingPointerLock = false;
            
            console.log("Pointer lock status changed:", this.pointerLock);
            
            // If we lost pointer lock while in first-person mode, try to regain it
            // after a short delay (but don't infinitely loop attempts)
            if (wasLocked && !this.pointerLock && Game.firstPersonMode) {
                console.log("Lost pointer lock while in first-person mode, will try to regain");
                setTimeout(() => {
                    if (Game.firstPersonMode && !this.pointerLock && !this.pendingPointerLock) {
                        this.requestPointerLock();
                    }
                }, 1000); // Wait a second before trying again
            }
        });
        
        // Pointer lock error event
        document.addEventListener('pointerlockerror', (event) => {
            console.error("Pointer lock error:", event);
            this.pendingPointerLock = false;
            
            // Clear any pending timeout
            if (this.pointerLockTimeout) {
                clearTimeout(this.pointerLockTimeout);
                this.pointerLockTimeout = null;
            }
        });
        
        // Add canvas click handler to capture pointer lock on canvas click
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('click', () => {
                if (Game.firstPersonMode && !this.pointerLock) {
                    this.requestPointerLock();
                }
            });
        }
        
        // Prevent context menu on right-click
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Create a debug UI to show current keys pressed
        this.createDebugUI();
        
        console.log('Input system initialized');
    },
    
    // Create a debug UI to show what keys are pressed
    createDebugUI: function() {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-keys';
        debugDiv.style.position = 'absolute';
        debugDiv.style.bottom = '10px';
        debugDiv.style.right = '10px';
        debugDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        debugDiv.style.color = 'white';
        debugDiv.style.padding = '10px';
        debugDiv.style.fontFamily = 'monospace';
        debugDiv.style.zIndex = '1000';
        document.body.appendChild(debugDiv);
        
        // Update the debug UI periodically
        setInterval(() => {
            let keysText = 'Active Keys: ';
            let anyKeysPressed = false;
            
            for (const key in this.keys) {
                if (this.keys[key]) {
                    keysText += key + ', ';
                    anyKeysPressed = true;
                }
            }
            
            if (!anyKeysPressed) {
                keysText += 'None';
            } else {
                keysText = keysText.slice(0, -2); // Remove trailing comma and space
            }
            
            debugDiv.textContent = keysText;
        }, 100);
    },
    
    // Check if a key is pressed
    isKeyPressed: function(code) {
        return this.keys[code] === true;
    },
    
    // Check if any of the provided keys are pressed
    isAnyKeyPressed: function(codes) {
        for (let code of codes) {
            if (this.isKeyPressed(code)) {
                return true;
            }
        }
        return false;
    },
    
    // Get movement direction based on keyboard input
    getMovementDirection: function(camera) {
        const direction = new THREE.Vector3(0, 0, 0);
        
        // Forward/Backward (Z-axis)
        if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
            direction.z = -1;
        } else if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
            direction.z = 1;
        }
        
        // Left/Right (X-axis)
        if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
            direction.x = -1;
        } else if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
            direction.x = 1;
        }
        
        // Log each pressed direction key
        console.log("Direction keys pressed - W:", this.isKeyPressed('KeyW'), 
                    "A:", this.isKeyPressed('KeyA'), 
                    "S:", this.isKeyPressed('KeyS'), 
                    "D:", this.isKeyPressed('KeyD'),
                    "Arrows:", this.isKeyPressed('ArrowUp'), this.isKeyPressed('ArrowLeft'), 
                    this.isKeyPressed('ArrowDown'), this.isKeyPressed('ArrowRight'));
        
        // If no movement, return zero vector
        if (direction.length() === 0) {
            console.log("No movement direction detected, returning zero vector");
            return direction;
        }
        
        // Log movement direction for debugging
        console.log('Movement direction before camera adjustment:', direction);
        
        // Normalize the direction vector
        direction.normalize();
        
        // Apply camera yaw rotation to movement direction
        // This ensures the player moves relative to where they're looking
        if (Game.firstPersonMode) {
            // Create rotation matrix from camera's Y rotation
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationY(camera.rotation.y);
            
            // Apply rotation to direction vector
            direction.applyMatrix4(rotationMatrix);
        } else {
            // For third-person, use the same logic
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationY(camera.rotation.y);
            direction.applyMatrix4(rotationMatrix);
        }
        
        // Log final direction for debugging
        console.log('Final direction after camera adjustment:', direction);
        
        return direction;
    },
    
    // Get camera rotation input
    getCameraRotation: function() {
        const rotation = { x: 0, y: 0 };
        
        // In first-person mode, always use mouse movement for camera rotation
        if (Game.firstPersonMode) {
            // Direct mapping of mouse deltas to rotation (inverted Y for typical FPS feel)
            rotation.x = -this.mouseDelta.y; // Vertical rotation (pitch), inverted
            rotation.y = -this.mouseDelta.x; // Horizontal rotation (yaw), inverted
            
            // Apply vertical sensitivity scale (makes vertical look less sensitive, like Minecraft)
            const verticalSensitivityScale = 0.7;
            rotation.x *= verticalSensitivityScale;
            
            // Don't reset mouse delta here - it's handled in the update method
            // to ensure consistent timing
            return rotation;
        }
        
        // For third-person view, use the original logic
        if (this.rightMouseDown) {
            return {
                x: this.mouseDelta.y * 2, // Vertical rotation (pitch)
                y: this.mouseDelta.x * 2  // Horizontal rotation (yaw)
            };
        }
        
        // Otherwise, use keyboard for camera rotation
        // Horizontal rotation (yaw) - Q and E keys
        if (this.isKeyPressed('KeyQ')) {
            rotation.y = 0.03; // Rotate left
        } else if (this.isKeyPressed('KeyE')) {
            rotation.y = -0.03; // Rotate right
        }
        
        // Vertical rotation (pitch) - R and F keys
        if (this.isKeyPressed('KeyR')) {
            rotation.x = 0.02; // Rotate up
        } else if (this.isKeyPressed('KeyF')) {
            rotation.x = -0.02; // Rotate down
        }
        
        return rotation;
    },
    
    // Check if jump button was JUST pressed (not held)
    isJumpPressed: function() {
        // Handle all possible scenarios for jump key detection
        
        // Scenario 1: Space was just pressed this frame (most reliable)
        if (this.spacePressedThisFrame && !this.spaceWasHandled) {
            console.log("Jump detected via spacePressedThisFrame");
            this.spaceWasHandled = true; // Mark as handled to prevent repeat jumps
            return true;
        }
        
        // Scenario 2: Use the standard just-pressed flag from keydown event
        if (this.spaceJustPressed && !this.spaceWasHandled) {
            console.log("Jump detected via spaceJustPressed flag");
            this.spaceWasHandled = true; // Mark as handled to prevent repeat jumps
            return true;
        }
        
        // No valid jump input detected
        return false;
    },
    
    // Check if mouse button is clicked
    isMouseClicked: function() {
        const clicked = this.isMouseDown;
        // Reset mouse down flag after checking
        this.isMouseDown = false;
        return clicked;
    },
    
    // Update method (for any per-frame input updates)
    update: function() {
        // Check if it's been too long since the last key press
        if (Date.now() - this.lastKeyPressTime > 5000) {
            // If so, log the current key states for debugging
            let activeKeys = [];
            for (const key in this.keys) {
                if (this.keys[key]) {
                    activeKeys.push(key);
                }
            }
            if (activeKeys.length > 0) {
                console.log('Active keys after timeout:', activeKeys);
            }
        }
        
        // Update previous key states AFTER processing input for this frame
        for (const key in this.keys) {
            this.previousKeys[key] = this.keys[key];
        }
        
        // Reset the space-related flags at the end of each frame
        if (this.spaceJustPressed) {
            console.log("Resetting spaceJustPressed flag");
            this.spaceJustPressed = false;
        }
        
        // Reset the per-frame space flag
        this.spacePressedThisFrame = false;
        
        // Allow space to be pressed again after key is released
        if (!this.keys['Space']) {
            this.spaceWasHandled = false;
        }
        
        // Reset mouse delta at the END of each frame
        // This ensures all systems that need these values during this frame can access them
        // But they'll be zeroed out for the next frame
        console.log("Resetting mouse delta - was:", this.mouseDelta.x, this.mouseDelta.y);
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
    },
    
    // Request pointer lock for first-person camera
    requestPointerLock: function() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas || !canvas.requestPointerLock) {
            console.error("Cannot request pointer lock - canvas is not available or browser doesn't support it");
            return;
        }
        
        // Don't request if already locked or pending
        if (this.pointerLock || this.pendingPointerLock) {
            console.log("Pointer lock already active or pending");
            return;
        }
        
        console.log("Requesting pointer lock");
        this.pendingPointerLock = true;
        
        try {
            canvas.requestPointerLock();
            
            // Set a timeout to reset the pending flag if the pointer lock isn't activated
            this.pointerLockTimeout = setTimeout(() => {
                if (this.pendingPointerLock) {
                    console.log("Pointer lock request timed out");
                    this.pendingPointerLock = false;
                }
            }, 1000);
        } catch (error) {
            console.error("Error requesting pointer lock:", error);
            this.pendingPointerLock = false;
        }
    },
    
    // Exit pointer lock
    exitPointerLock: function() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    },
    
    // Toggle between first-person and third-person modes
    toggleFirstPersonMode: function() {
        // Toggle the mode
        Game.firstPersonMode = !Game.firstPersonMode;
        Character.isFirstPerson = Game.firstPersonMode;
        
        // Update character visibility
        if (Character.updateVisibility) {
            Character.updateVisibility();
        } else {
            // Fallback for old code
            // Toggle head visibility based on mode
            if (Character.parts && Character.parts.head) {
                Character.parts.head.visible = !Game.firstPersonMode;
            }
            
            // Toggle first-person arms visibility
            if (Character.parts && Character.parts.fpArms) {
                Character.parts.fpArms.visible = Game.firstPersonMode;
            }
        }
        
        // Toggle pointer lock based on first-person mode
        if (Game.firstPersonMode) {
            // Request pointer lock using our controls
            if (Game.controls) {
                Game.controls.lock();
            } else {
                this.requestPointerLock();
            }
        } else {
            // Exit pointer lock
            if (Game.controls) {
                Game.controls.unlock();
            } else {
                this.exitPointerLock();
            }
        }
        
        // Update crosshair visibility
        Game.updateCrosshairVisibility();
        
        console.log("Toggled first-person mode:", Game.firstPersonMode);
    }
}; 