/**
 * Input handling for 3D SMASH Game
 */

const Input = {
    keys: {},
    previousKeys: {}, // Store previous frame's key state
    mousePosition: { x: 0, y: 0 },
    mouseDelta: { x: 0, y: 0 }, // Raw mouse delta this frame
    isMouseDown: false, // Left mouse button state this frame
    wasMouseDown: false, // Left mouse button state previous frame
    rightMouseDown: false,
    mouseSensitivity: 0.002, // Base sensitivity
    pointerLock: false,
    // REMOVED redundant flags: pendingPointerLock, pointerLockTimeout, lastKeyPressTime
    // REMOVED redundant jump flags: spaceJustPressed, spacePressedThisFrame, spaceWasHandled

    init: function() {
        console.log('Initializing input system');
        this.keys = {};
        this.previousKeys = {};

        window.addEventListener('keydown', (event) => {
            if (!this.keys[event.code]) { // Only log first press
                 console.log('Keydown:', event.code);
            }
            this.keys[event.code] = true;

            // Corrected: Toggle Game.debugMode on P key press
            if (event.code === 'KeyP' && !this.previousKeys['KeyP']) { // Check if just pressed
                if (window.Game) { // Ensure Game object exists
                    Game.debugMode = !Game.debugMode;
                    const debugPanel = document.getElementById('debug-panel');
                    const debugKeys = document.getElementById('debug-keys');
                    if (debugPanel) debugPanel.style.display = Game.debugMode ? 'block' : 'none';
                    if (debugKeys) debugKeys.style.display = Game.debugMode ? 'block' : 'none';
                    console.log("Debug mode toggled via Input:", Game.debugMode);
                }
            }

            // Special handling for Escape key (exit pointer lock)
            if (event.code === 'Escape') {
                 if (this.pointerLock && Game.controls) {
                     Game.controls.unlock(); // Use controls' unlock method
                 }
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            // console.log('Keyup:', event.code);
        });

        window.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left button
                this.isMouseDown = true;
                 // Request pointer lock on click ONLY if in FP mode and not already locked
                 if (Game.firstPersonMode && !this.pointerLock && Game.controls) {
                     Game.controls.lock();
                 }
            } else if (event.button === 2) { // Right button
                this.rightMouseDown = true;
            }
        });

        window.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Left button
                this.isMouseDown = false;
            } else if (event.button === 2) { // Right button
                this.rightMouseDown = false;
            }
        });

        // Mouse move event - ONLY updates mouseDelta when locked
        window.addEventListener('mousemove', (event) => {
            // Only capture delta if pointer is locked
            if (this.pointerLock) {
                const sensitivity = this.mouseSensitivity * Game.controls.pointerSpeed; // Use sensitivity from controls
                const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
                const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

                // Accumulate delta for this frame. PointerLockControls will read this.
                this.mouseDelta.x += movementX * sensitivity;
                this.mouseDelta.y += movementY * sensitivity;
                // console.log("Mouse delta:", this.mouseDelta.x, this.mouseDelta.y); // Debug
            }
             // In third person or unlocked, mouse doesn't control camera this way
             // We might track absolute position for UI later if needed
             else {
                 this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
                 this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
             }
        });

        // Pointer lock change event - Update internal state
        document.addEventListener('pointerlockchange', () => {
            this.pointerLock = document.pointerLockElement === Game.renderer.domElement;
            console.log("Pointer lock status changed:", this.pointerLock);
             // Update Game.controls state if necessary (though it handles its own state)
             if (Game.controls) Game.controls.isLocked = this.pointerLock;
        });

        document.addEventListener('pointerlockerror', (event) => {
            console.error("Pointer lock error:", event);
            this.pointerLock = false; // Ensure state is correct
             if (Game.controls) Game.controls.isLocked = false;
        });

        // Add canvas click handler for robustness (already handled in mousedown)
        /*
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('click', () => {
                if (Game.firstPersonMode && !this.pointerLock && Game.controls) {
                    Game.controls.lock();
                }
            });
        }
        */

        // Prevent context menu on right-click
        window.addEventListener('contextmenu', (event) => event.preventDefault());

        this.createDebugUI(); // Keep debug UI
        console.log('Input system initialized');
    },

    createDebugUI: function() { // Keep unchanged
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

        setInterval(() => {
            let keysText = 'Active Keys: ';
            let anyKeysPressed = false;
            for (const key in this.keys) {
                if (this.keys[key]) {
                    keysText += key + ', ';
                    anyKeysPressed = true;
                }
            }
            if (!anyKeysPressed) keysText += 'None';
            else keysText = keysText.slice(0, -2);
            debugDiv.textContent = keysText;
        }, 100);
    },

    // Check if a key is currently held down
    isKeyPressed: function(code) {
        return !!this.keys[code]; // Use !! for explicit boolean
    },

    // Check if a key was pressed down THIS FRAME
    isKeyJustPressed: function(code) {
        return !!this.keys[code] && !this.previousKeys[code];
    },

    // Check if a key was released THIS FRAME
    isKeyJustReleased: function(code) {
        return !this.keys[code] && !!this.previousKeys[code];
    },

    // Check if any of the provided keys are held down
    isAnyKeyPressed: function(codes) {
        for (let code of codes) {
            if (this.isKeyPressed(code)) return true;
        }
        return false;
    },

    // Get movement direction based on keyboard input and camera look direction
    getMovementDirection: function(camera) {
        const direction = new THREE.Vector3(0, 0, 0);
        let inputDetected = false;

        if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
            direction.z = -1; inputDetected = true;
        } else if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
            direction.z = 1; inputDetected = true;
        }

        if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
            direction.x = -1; inputDetected = true;
        } else if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
            direction.x = 1; inputDetected = true;
        }

        if (!inputDetected) {
            return direction; // Return zero vector if no input
        }

        // Normalize the input direction vector
        direction.normalize();

        // Get the camera's forward direction projected onto the XZ plane
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection); // Get world direction
        cameraDirection.y = 0; // Project onto XZ plane
        cameraDirection.normalize();

        // Create a quaternion representing the camera's yaw rotation
        const yawQuaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, -1), // Base forward
            cameraDirection // Target forward (on XZ plane)
        );

        // Apply the yaw rotation to the input direction
        direction.applyQuaternion(yawQuaternion);

        // console.log('Final direction:', direction); // Debug
        return direction;
    },

    // Get camera rotation input - NO LONGER needed for FP mouse look
    // PointerLockControls handles mouse input directly.
    // This could still be used for third-person keyboard/mouse-drag rotation.
    getCameraRotationInputDelta: function() {
        const rotationDelta = { x: 0, y: 0 };

        // Third-person keyboard rotation (Q/E/R/F)
        if (!Game.firstPersonMode) {
            if (this.isKeyPressed('KeyQ')) rotationDelta.y = 0.03;
            else if (this.isKeyPressed('KeyE')) rotationDelta.y = -0.03;
            if (this.isKeyPressed('KeyR')) rotationDelta.x = 0.02;
            else if (this.isKeyPressed('KeyF')) rotationDelta.x = -0.02;

             // Third-person mouse drag rotation (Right click + drag)
             // This requires tracking mouse delta when rightMouseDown is true but not locked
             // Let's simplify and remove this for now. Add back if needed.
             /*
             if (this.rightMouseDown && !this.pointerLock) {
                 // Calculate delta based on absolute mouse position changes
                 // This needs previousMousePosition tracking similar to the old code
                 // rotationDelta.x += ...
                 // rotationDelta.y += ...
             }
             */
        }
         // In first person + locked, mouse delta is handled by PointerLockControls

        return rotationDelta;
    },


    // Simplified jump check using "just pressed" state
    isJumpJustPressed: function() {
        return this.isKeyJustPressed('Space');
    },

    // Simplified mouse click check
    isMouseJustClicked: function() {
         // Check if mouse down this frame AND was not down last frame
        return this.isMouseDown && !this.wasMouseDown;
    },

    // Update method - Call at the START of the game loop frame
    updateStartFrame: function() {
        // Reset mouse delta accumulation for the new frame
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;

        // Store current mouse down state for next frame's "just clicked" check
        this.wasMouseDown = this.isMouseDown;
    },

    // Update method - Call at the END of the game loop frame
    updateEndFrame: function() {
        // Copy current key states to previousKeys for the next frame's "just pressed" checks
        // Use Object.assign for a shallow copy
        this.previousKeys = Object.assign({}, this.keys);

        // Note: Mouse delta is reset at the START of the frame now.
    }
};