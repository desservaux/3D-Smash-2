/**
 * Main game controller for 3D SMASH Game
 */

const Game = {
    // Three.js components
    scene: null,
    camera: null,
    renderer: null,
    
    // Game objects
    player: null,
    island: null,
    dummyTarget: null,
    
    // Game state
    isRunning: false,
    lastTime: 0,
    debugMode: true, // Enable debug mode
    
    // Camera settings
    cameraDistance: 10, // Will be unused in first-person mode
    cameraHeight: 8,    // Will be unused in first-person mode
    cameraRotation: {
        x: 0, // Initial pitch (up/down angle) - reset to 0 for first-person
        y: 0  // Initial yaw (left/right angle) - reset to 0 for first-person
    },
    minCameraPitch: -Math.PI / 2, // Minimum camera pitch (looking down) - adjusted for first-person
    maxCameraPitch: Math.PI / 2,  // Maximum camera pitch (looking up) - adjusted for first-person
    firstPersonMode: true, // Flag to indicate first-person mode
    eyeHeight: 0.6, // Eye height relative to character position
    headBobEnabled: true, // Enable head bobbing when walking
    headBobAmount: 0.05, // Amount of head bobbing
    headBobSpeed: 10, // Speed of head bobbing
    headBobTime: 0, // Time counter for head bobbing
    
    // Pointer lock controls
    controls: null,
    
    // Initialize game
    init: function() {
        console.log('Initializing game...');
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.05, // Reduced near plane for first-person
            1000
        );
        // Initial camera position will be set in updateCamera
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('game-canvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        
        // Create crosshair for first-person mode
        this.createCrosshair();
        
        // Initialize textures
        TextureManager.init();
        
        // Initialize physics
        const world = Physics.init();
        
        // Create island
        this.island = Island.create(this.scene, world);
        
        // Create player character
        this.player = Character;
        this.player.create(this.scene, world, Island.getSpawnPosition());
        
        // Create dummy target for knockback testing
        // Position it at eye level, in front of the player
        this.dummyTarget = Physics.createDummy(
            this.scene, 
            new THREE.Vector3(3, 0.4, 0) // Position on the ground, 3 units away
        );
        
        // Add light
        this.addLights();
        
        // Initialize pointer lock controls
        this.controls = PointerLockControls.init(this.camera, document.getElementById('game-canvas'));
        this.controls.pointerSpeed = 1.0; // Adjust sensitivity
        
        // Initialize input system
        Input.init();
        
        // Create debug visualizations
        if (this.debugMode) {
            this.createDebugVisuals();
        }
        
        // Setup window resize handler
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Set game as running
        this.isRunning = true;
        
        // Create debug panel if debug mode is enabled
        if (this.debugMode) {
            this.createDebugPanel();
        }
        
        // Update debug panel every frame
        this.updateDebugPanel = function() {
            if (!this.player || !this.player.body) return;
            
            const playerPos = this.player.body.position;
            const playerVel = this.player.body.velocity;
            const camRot = this.cameraRotation;
            
            // Update debug panel content
            const debugPanel = document.getElementById('debug-panel');
            if (debugPanel) {
                debugPanel.innerHTML = `
                    <div>FPS: ${Math.round(1 / this.lastDeltaTime)}</div>
                    <div>Camera Mode: ${this.firstPersonMode ? 'First-Person' : 'Third-Person'} (Press P to toggle)</div>
                    <div>Pointer Lock: ${this.controls.isLocked ? 'Active' : 'Inactive'}</div>
                    <div>Position: X=${playerPos.x.toFixed(2)}, Y=${playerPos.y.toFixed(2)}, Z=${playerPos.z.toFixed(2)}</div>
                    <div>Velocity: X=${playerVel.x.toFixed(2)}, Y=${playerVel.y.toFixed(2)}, Z=${playerVel.z.toFixed(2)}</div>
                    <div>Camera Rot: X=${camRot.x.toFixed(2)}, Y=${camRot.y.toFixed(2)}</div>
                    <div>On Ground: ${this.player.isOnGround}</div>
                    <div>Can Jump: ${this.player.canJump}</div>
                    <div>Can Double Jump: ${this.player.canDoubleJump}</div>
                    <div>Controls: WASD = Move, Space = Jump, Mouse = Look</div>
                    <div>Click Canvas: Activate Pointer Lock</div>
                `;
            }
        };
        
        // Do one camera update to set initial position
        this.updateCamera(0);
        
        console.log('Game initialized successfully');
    },
    
    // Add lights to the scene
    addLights: function() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light for shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        
        this.scene.add(directionalLight);
    },
    
    // Handle window resize
    onWindowResize: function() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },
    
    // Update camera rotation based on input
    updateCameraRotation: function(deltaTime) {
        // Get camera rotation input
        const rotation = Input.getCameraRotation();
        
        // Apply rotation with proper delta time scaling for consistent movement
        this.cameraRotation.y += rotation.y * (deltaTime * 60); // Normalize to 60fps
        this.cameraRotation.x += rotation.x * (deltaTime * 60); // Normalize to 60fps
        
        // Clamp vertical rotation to prevent flipping
        this.cameraRotation.x = Utils.clamp(
            this.cameraRotation.x,
            this.minCameraPitch,
            this.maxCameraPitch
        );
        
        // Log camera rotation for debugging
        console.log('Camera rotation after update:', this.cameraRotation);
    },
    
    // Update camera position to follow player in first-person
    updateCamera: function(deltaTime) {
        if (this.firstPersonMode) {
            // Get player position
            const playerPos = this.player.model.position;
            
            // Calculate head bobbing if enabled and player is moving and on ground
            let bobOffset = 0;
            if (this.headBobEnabled && this.player.isMoving && this.player.isOnGround) {
                this.headBobTime += deltaTime * this.headBobSpeed;
                bobOffset = Math.sin(this.headBobTime) * this.headBobAmount;
            }
            
            // Position camera at player's eye level with bobbing
            this.camera.position.x = playerPos.x;
            this.camera.position.y = playerPos.y + this.eyeHeight + bobOffset;
            this.camera.position.z = playerPos.z;
            
            // For first-person, we have two camera control modes:
            if (this.controls && this.controls.isLocked) {
                // 1. Pointer Lock Controls (preferred)
                // Nothing to do here - controls handle the rotation
                
                // Sync our internal rotation tracker with the camera
                const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                euler.setFromQuaternion(this.camera.quaternion);
                this.cameraRotation.x = euler.x;
                this.cameraRotation.y = euler.y;
            } else {
                // 2. Fallback: Manual rotation (used when pointer lock is not available)
                this.updateCameraRotation(deltaTime);
                
                // Apply rotations with proper order to avoid gimbal lock
                this.camera.rotation.order = "YXZ"; // Yaw, Pitch, Roll order
                this.camera.rotation.x = this.cameraRotation.x;
                this.camera.rotation.y = this.cameraRotation.y;
                this.camera.rotation.z = 0; // No roll
            }
            
            // ALWAYS update player model rotation to match camera's yaw
            // This ensures the physics body and hit detection work properly
            this.player.model.rotation.y = this.cameraRotation.y;
        } else {
            // Third-person mode
            // First update camera rotation
            this.updateCameraRotation(deltaTime);
            
            const playerPos = this.player.model.position;
            
            // Calculate orbit camera position based on distance and rotation
            const offsetX = Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x) * this.cameraDistance;
            const offsetY = Math.sin(this.cameraRotation.x) * this.cameraDistance;
            const offsetZ = Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x) * this.cameraDistance;
            
            // Set camera position
            this.camera.position.x = playerPos.x - offsetX;
            this.camera.position.y = playerPos.y + this.cameraHeight + offsetY;
            this.camera.position.z = playerPos.z - offsetZ;
            
            // Make camera look at player
            this.camera.lookAt(
                playerPos.x,
                playerPos.y + 1, // Look slightly above the player
                playerPos.z
            );
        }
    },
    
    // Create crosshair for first-person mode
    createCrosshair: function() {
        // Create crosshair element
        const crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        
        // Create crosshair lines
        const verticalLine = document.createElement('div');
        verticalLine.className = 'crosshair-line vertical';
        
        const horizontalLine = document.createElement('div');
        horizontalLine.className = 'crosshair-line horizontal';
        
        // Add lines to crosshair
        crosshair.appendChild(verticalLine);
        crosshair.appendChild(horizontalLine);
        
        // Add crosshair to body
        document.body.appendChild(crosshair);
        
        // Store reference to crosshair
        this.crosshair = crosshair;
        
        // Initially set visibility based on first-person mode
        this.updateCrosshairVisibility();
    },
    
    // Update crosshair visibility based on first-person mode
    updateCrosshairVisibility: function() {
        if (this.crosshair) {
            this.crosshair.style.display = this.firstPersonMode ? 'block' : 'none';
        }
    },
    
    // Process player input
    processInput: function(deltaTime) {
        // Update input system first, before checking any keys
        Input.update();
        
        // Update crosshair visibility in case mode changed
        this.updateCrosshairVisibility();
        
        // Get movement direction based on camera orientation
        const direction = Input.getMovementDirection(this.camera);
        
        // Move player based on input
        this.player.move(direction, deltaTime);
        
        // Handle jump
        const spacePressed = Input.isKeyPressed('Space');
        const jumpPossible = (this.player.canJump && this.player.isOnGround) || 
                           (this.player.canDoubleJump && !this.player.isOnGround);
                           
        // Try to jump both when spaceJustPressed flag is set OR space is held down (every few frames)
        // This gives us a backup method in case the flag-based approach isn't working
        if ((Input.isJumpPressed() || (spacePressed && Math.random() < 0.1)) && jumpPossible) {
            console.log("Jump attempt - flag or random chance while key held");
            this.player.jump();
        } else {
            // Log why jump failed if space was pressed but jump didn't happen
            if (spacePressed && !jumpPossible) {
                console.log("Jump failed: Can't jump (canJump:", this.player.canJump, 
                           "canDoubleJump:", this.player.canDoubleJump, 
                           "isOnGround:", this.player.isOnGround, ")");
            }
        }
        
        // Handle knockback (punch)
        if (Input.isMouseClicked()) {
            // Always trigger punch animation on mouse click
            this.player.startPunchAnimation();
            
            // Calculate distance to dummy
            const playerPos = new THREE.Vector3().copy(this.player.model.position);
            const dummyPos = new THREE.Vector3().copy(this.dummyTarget.mesh.position);
            const distance = playerPos.distanceTo(dummyPos);
            
            // Only apply knockback if close enough
            if (distance < 3) {
                this.player.applyKnockback(this.dummyTarget);
            }
        }
    },
    
    // Check if player is out of bounds
    checkBounds: function() {
        // Check if player fell off the island
        if (Utils.isOutOfBounds(this.player.model.position, Island.size)) {
            // Reset player position
            this.player.reset(Island.getSpawnPosition());
        }
        
        // Check if dummy fell off the island
        if (Utils.isOutOfBounds(this.dummyTarget.mesh.position, Island.size)) {
            // Reset dummy position
            Physics.resetObject(
                this.dummyTarget, 
                new THREE.Vector3(3, 0.4, 0) // Reset to starting position on the ground
            );
        }
    },
    
    // Create a debug visualization for the camera direction
    createDebugVisuals: function() {
        // Create a direction indicator for the camera
        const arrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, -1), // Default forward direction
            new THREE.Vector3(0, 0, 0),  // Origin
            2,                           // Length
            0xff0000,                    // Color (red)
            0.2,                         // Head length
            0.1                          // Head width
        );
        
        // Add to scene
        this.scene.add(arrowHelper);
        
        // Store reference
        this.debugArrow = arrowHelper;
    },
    
    // Update debug visualization
    updateDebugVisuals: function() {
        if (!this.debugArrow) return;
        
        // Update position to match camera
        this.debugArrow.position.copy(this.camera.position);
        
        // Calculate direction vector from camera rotation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(this.camera.rotation);
        
        // Update arrow direction
        this.debugArrow.setDirection(direction);
    },
    
    // Game loop
    update: function(currentTime) {
        if (!this.isRunning) return;
        
        // Request next frame
        requestAnimationFrame((time) => this.update(time));
        
        // Calculate delta time
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        this.lastDeltaTime = deltaTime;
        
        // Skip if delta time is too high (indicates tab was inactive)
        if (deltaTime > 0.1) return;
        
        // Process input
        this.processInput(deltaTime);
        
        // Update physics
        Physics.update(deltaTime);
        
        // Update game objects
        this.player.update(deltaTime);
        Physics.updateObjectMesh(this.dummyTarget);
        Island.update(deltaTime);
        
        // Check if player is out of bounds
        this.checkBounds();
        
        // Update camera
        this.updateCamera(deltaTime);
        
        // Update debug visualizations
        if (this.debugMode && this.debugArrow) {
            this.updateDebugVisuals();
        }
        
        // Update debug information if debug mode is enabled
        if (this.debugMode && this.updateDebugPanel) {
            this.updateDebugPanel();
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    },
    
    // Start game
    start: function() {
        console.log('Starting game loop');
        this.isRunning = true;
        this.lastTime = performance.now();
        this.lastDeltaTime = 0;
        this.update(this.lastTime);
    },
    
    // Create debug panel
    createDebugPanel: function() {
        // Add debug info panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.position = 'absolute';
        debugPanel.style.top = '10px';
        debugPanel.style.left = '10px';
        debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        debugPanel.style.color = 'white';
        debugPanel.style.padding = '10px';
        debugPanel.style.fontFamily = 'monospace';
        debugPanel.style.zIndex = '1000';
        document.body.appendChild(debugPanel);
    }
}; 