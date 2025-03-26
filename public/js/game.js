/**
 * Main game controller for 3D SMASH Game
 */

const Game = {
    // Three.js components
    scene: null,
    camera: null,
    renderer: null,
    canvas: null, // Store canvas reference

    // Game objects
    player: null,
    world: null, // Renamed from island
    dummyTarget: null,

    // Game state
    isRunning: false,
    lastTime: 0,
    lastDeltaTime: 0, // Store last delta time for FPS calculation
    debugMode: true,

    // Camera settings
    // REMOVED third-person camera distance/height - focus on FP first
    // cameraDistance: 10,
    // cameraHeight: 8,
    // cameraRotation: { x: 0, y: 0 }, // No longer needed - PointerLockControls manages directly
    // minCameraPitch: -Math.PI / 2 + 0.1, // Use limits in PointerLockControls
    // maxCameraPitch: Math.PI / 2 - 0.1,
    firstPersonMode: true,
    eyeHeight: 1.6, // Player eye height in meters (relative to player origin at feet)
    headBobEnabled: true,
    headBobAmount: 0.02, // Reduced bob amount
    headBobSpeed: 6, // Slower bob speed
    headBobTime: 0,

    // Physics world reference
    physicsWorld: null,

    // Pointer lock controls instance
    controls: null,
    crosshair: null, // Crosshair DOM element

    init: function() {
        console.log('Initializing game...');
        this.canvas = document.getElementById('game-canvas');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 5, 50); // Add fog for depth

        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight,
            0.1, // Near plane
            100 // Far plane (reduced to match fog)
        );
        // Initial camera position will be set relative to player in updateCamera

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

        this.createCrosshair();

        TextureManager.init();

        // Initialize physics AFTER textures
        this.physicsWorld = Physics.init();

        // Create the world (replace Island)
        this.world = World; // Use the World module
        this.world.create(this.scene, this.physicsWorld);

        // Create player character
        this.player = Character;
        const spawnPos = this.world.getSpawnPosition(); // Get spawn from world
        this.player.create(this.scene, this.physicsWorld, spawnPos);

        // Add FP arms as a child of the camera
        if (this.player.parts.fpArms) {
            this.camera.add(this.player.parts.fpArms);
            console.log("FP Arms added to camera");
        }


        // Create dummy target (position relative to spawn)
        this.dummyTarget = Physics.createDummy(
            this.scene,
            new THREE.Vector3(spawnPos.x + 3, spawnPos.y + 0.4, spawnPos.z)
        );

        this.addLights();

        // Initialize pointer lock controls using the canvas
        this.controls = PointerLockControls.init(this.camera, this.canvas);
        this.controls.pointerSpeed = 0.8; // Adjust sensitivity if needed

        Input.init(); // Initialize input AFTER controls

        if (this.debugMode) {
            this.createDebugVisuals(); // Keep debug visuals
            this.createDebugPanel(); // Keep debug panel
        }

        window.addEventListener('resize', () => this.onWindowResize());

        this.isRunning = true;

        // Initial camera position update
        this.updateCamera(0);

        console.log('Game initialized successfully');
    },

    addLights: function() {
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6); // Slightly less intense ambient
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(30, 50, 40); // Sun angle
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048; // Higher res shadow map
        sunLight.shadow.mapSize.height = 2048;
        // Adjust shadow camera bounds to fit the world size
        const shadowCamSize = World.size * World.blockSize; // Use world size
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 150;
        sunLight.shadow.camera.left = -shadowCamSize / 2;
        sunLight.shadow.camera.right = shadowCamSize / 2;
        sunLight.shadow.camera.top = shadowCamSize / 2;
        sunLight.shadow.camera.bottom = -shadowCamSize / 2;
        sunLight.shadow.bias = -0.001; // Reduce shadow acne

        this.scene.add(sunLight);
        // this.scene.add(new THREE.CameraHelper(sunLight.shadow.camera)); // Debug shadow frustum
    },

    onWindowResize: function() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    // REMOVED: updateCameraRotation - PointerLockControls handles this directly

    updateCamera: function(deltaTime) {
        if (!this.player || !this.player.body) return;

        const playerBodyPos = this.player.body.position;

        // Always position camera at player's eye level
        let targetCameraY = playerBodyPos.y + this.eyeHeight;

        // Calculate head bobbing offset
        let bobOffsetY = 0;
        if (this.headBobEnabled && this.player.isMoving && this.player.isOnGround) {
            this.headBobTime += deltaTime * this.headBobSpeed;
            bobOffsetY = Math.sin(this.headBobTime) * this.headBobAmount;
        } else {
             // Reset bob time when not bobbing
             this.headBobTime = 0;
        }

        // Smoothly interpolate camera position towards target
        const lerpFactor = deltaTime * 15.0; // Adjust responsiveness
        this.camera.position.x = Utils.lerp(this.camera.position.x, playerBodyPos.x, lerpFactor);
        this.camera.position.y = Utils.lerp(this.camera.position.y, targetCameraY + bobOffsetY, lerpFactor);
        this.camera.position.z = Utils.lerp(this.camera.position.z, playerBodyPos.z, lerpFactor);


        // Camera ROTATION is handled entirely by PointerLockControls.onMouseMove
        // No need to manually set camera.rotation here if controls are active.

        // Ensure the player's physics body rotation matches the camera's yaw in FP mode
        // This is now handled within Character.update()

        // Update third-person camera logic if re-enabled later
        if (!this.firstPersonMode) {
            // TODO: Implement third-person camera logic if needed
            // It would involve calculating offset based on Game.controls.euler.x/y
            // and performing raycasts to avoid clipping through walls.
        }
    },


    createCrosshair: function() { // Keep unchanged
        const crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        const verticalLine = document.createElement('div');
        verticalLine.className = 'crosshair-line vertical';
        const horizontalLine = document.createElement('div');
        horizontalLine.className = 'crosshair-line horizontal';
        crosshair.appendChild(verticalLine);
        crosshair.appendChild(horizontalLine);
        document.body.appendChild(crosshair);
        this.crosshair = crosshair;
        this.updateCrosshairVisibility();
    },

    updateCrosshairVisibility: function() {
        if (this.crosshair) {
            // *** ADD THIS CHECK: *** Only check isLocked if controls exists
            const showCrosshair = this.firstPersonMode && this.controls && this.controls.isLocked;
            this.crosshair.style.display = showCrosshair ? 'block' : 'none';
        }
    },



    processInput: function(deltaTime) {
        // Update input system (caches current state, resets frame-specific flags)
        Input.updateStartFrame(); // Call at start

        // Toggle camera mode (handled in Input.init via key listener)

        // Get movement direction relative to camera
        const direction = Input.getMovementDirection(this.camera);
        this.player.move(direction, deltaTime);

        // Handle jump (using the reliable "just pressed" check)
        if (Input.isJumpJustPressed()) {
             console.log("Jump key just pressed, attempting jump...");
            this.player.jump();
        }

        // Handle punch/action (using reliable "just clicked" check)
        if (Input.isMouseJustClicked()) {
            console.log("Mouse just clicked, attempting punch...");
            this.player.startPunchAnimation();

            // Apply knockback (check distance)
            const playerPos = this.player.body.position;
            const dummyPos = this.dummyTarget.body.position;
            const distanceSq = playerPos.distanceSquared(dummyPos); // Use squared distance
            if (distanceSq < 3 * 3) { // Range check (3 units)
                this.player.applyKnockback(this.dummyTarget);
            }
             // TODO: Add block breaking/placing raycast here later
        }

         // Third-person camera rotation input (if mode is enabled)
         if (!this.firstPersonMode) {
             const rotDelta = Input.getCameraRotationInputDelta();
             // Apply rotDelta to camera (e.g., using controls.euler or directly)
             // Need to re-implement this part carefully if TP mode is desired.
         }
    },

    checkBounds: function() {
        // Check if player fell off the world
        if (this.player.body.position.y < -10) { // Simple Y check for falling
            this.player.reset(this.world.getSpawnPosition());
            console.log("Player fell out of bounds, resetting.");
        }

        // Check if dummy fell off
        if (this.dummyTarget.body.position.y < -10) {
            Physics.resetObject(
                this.dummyTarget,
                // Recalculate initial dummy position relative to spawn
                 new THREE.Vector3(this.world.getSpawnPosition().x + 3, this.world.getSpawnPosition().y + 0.4, this.world.getSpawnPosition().z)
            );
            console.log("Dummy fell out of bounds, resetting.");
        }
    },

    createDebugVisuals: function() { // Keep unchanged
        const arrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 0),
            2, 0xff0000, 0.2, 0.1
        );
        this.scene.add(arrowHelper);
        this.debugArrow = arrowHelper;
    },

    updateDebugVisuals: function() { // Keep unchanged
        if (!this.debugArrow || !this.camera) return;
        this.debugArrow.position.copy(this.camera.position);
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion); // Use quaternion directly
        this.debugArrow.setDirection(direction);
    },

    updateDebugPanel: function() { // Update panel content
        if (!this.player || !this.player.body || !this.debugMode) return;

        const playerPos = this.player.body.position;
        const playerVel = this.player.body.velocity;
        const camEuler = this.controls.euler; // Get rotation from controls

        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            debugPanel.innerHTML = `
                <div>FPS: ${this.lastDeltaTime > 0 ? Math.round(1 / this.lastDeltaTime) : 'N/A'}</div>
                <div>Mode: ${this.firstPersonMode ? 'First-Person' : 'Third-Person'} (P)</div>
                <div>Pointer Lock: ${this.controls.isLocked}</div>
                <div>Pos: ${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)}</div>
                <div>Vel: ${playerVel.x.toFixed(1)}, ${playerVel.y.toFixed(1)}, ${playerVel.z.toFixed(1)}</div>
                <div>Cam Rot: X=${camEuler.x.toFixed(2)}, Y=${camEuler.y.toFixed(2)}</div>
                <div>Grounded: ${this.player.isOnGround}</div>
                <div>Can Jump: ${this.player.canJump}</div>
                <div>Moving: ${this.player.isMoving}</div>
                <div>Click Canvas: Activate Lock</div>
            `;
        }
    },


    // Game loop
    update: function(currentTime) {
        if (!this.isRunning) return;

        requestAnimationFrame((time) => this.update(time));

        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05); // Clamp delta time
        this.lastTime = currentTime;
        this.lastDeltaTime = deltaTime; // Store for FPS display

        if (deltaTime <= 0) return; // Skip if no time passed


        // 1. Process Input (reads keys/mouse, calculates movement vector)
        this.processInput(deltaTime);

        // 2. Update Physics (steps the simulation)
        Physics.update(deltaTime);

        // 3. Update Game Objects (sync meshes, run logic, animations)
        this.player.update(deltaTime);
        Physics.updateObjectMesh(this.dummyTarget); // Sync dummy mesh
        this.world.update(deltaTime); // Update world (e.g., animated textures)

        // 4. Check Bounds / Game Rules
        this.checkBounds();

        // 5. Update Camera Position (follows player)
        //    Camera Rotation is handled by PointerLockControls internally via mouse events
        this.updateCamera(deltaTime);

        // 6. Update UI / Debug Info
        this.updateCrosshairVisibility(); // Show/hide crosshair based on lock state
        if (this.debugMode) {
            this.updateDebugVisuals();
            this.updateDebugPanel();
        }

        // 7. Update Input System End Frame (copy current state to previous state)
        Input.updateEndFrame(); // Call at end

        // 8. Render Scene
        this.renderer.render(this.scene, this.camera);
    },

    start: function() {
        console.log('Starting game loop');
        this.isRunning = true;
        this.lastTime = performance.now();
        this.lastDeltaTime = 0; // Initialize delta time
        this.update(this.lastTime);
    },

    createDebugPanel: function() { // Keep unchanged
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
    },

     // Added method for toggling FP/TP (called by Input)
     toggleFirstPersonMode: function() {
         this.firstPersonMode = !this.firstPersonMode;
         this.player.isFirstPerson = this.firstPersonMode;
         this.player.updateVisibility(); // Update player model visibility

         if (this.firstPersonMode) {
             this.controls.lock(); // Enter pointer lock
         } else {
             this.controls.unlock(); // Exit pointer lock
             // Reset camera rotation if switching to TP? Or keep orientation?
             // Might need specific TP camera logic here.
         }
         this.updateCrosshairVisibility(); // Update crosshair now
         console.log("Toggled first-person mode:", this.firstPersonMode);
     }
};