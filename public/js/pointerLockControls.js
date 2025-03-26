/**
 * Custom PointerLockControls implementation for first-person camera control
 * Based on the official Three.js PointerLockControls, simplified
 */

const PointerLockControls = {
    camera: null,
    domElement: null, // The element that requests pointer lock (canvas)
    isLocked: false,

    // Camera rotation limits
    minPolarAngle: 0.05, // radians (slightly less than 0 to look slightly up)
    maxPolarAngle: Math.PI - 0.05, // radians (slightly less than PI to look slightly down)

    pointerSpeed: 1.0, // Sensitivity multiplier

    // Internal state for rotation
    euler: new THREE.Euler(0, 0, 0, 'YXZ'), // Use YXZ order for FPS controls

    // Event callbacks
    _onMouseMove: null,
    _onPointerlockChange: null,
    _onPointerlockError: null,

    init: function(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.isLocked = false;

        // Ensure camera uses the same Euler order
        this.camera.rotation.order = 'YXZ';

        // Bind event listeners only once
        this._onMouseMove = this.onMouseMove.bind(this);
        this._onPointerlockChange = this.onPointerlockChange.bind(this);
        this._onPointerlockError = this.onPointerlockError.bind(this);

        this.connect();
        console.log('PointerLockControls initialized');
        return this;
    },

    connect: function() {
        // Listen for mouse movements when locked
        document.addEventListener('mousemove', this._onMouseMove);
        // Listen for pointer lock state changes
        document.addEventListener('pointerlockchange', this._onPointerlockChange);
        document.addEventListener('pointerlockerror', this._onPointerlockError);
    },

    disconnect: function() {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('pointerlockchange', this._onPointerlockChange);
        document.removeEventListener('pointerlockerror', this._onPointerlockError);
    },

    // Handle mouse movement ONLY when locked
    onMouseMove: function(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        // Apply rotation delta based on mouse movement
        // Adjust pitch (X rotation) based on movementY
        // Adjust yaw (Y rotation) based on movementX
        this.euler.setFromQuaternion(this.camera.quaternion);

        this.euler.y -= movementX * 0.002 * this.pointerSpeed; // Yaw
        this.euler.x -= movementY * 0.002 * this.pointerSpeed; // Pitch

        // Clamp pitch to prevent flipping over
        this.euler.x = Math.max(Math.PI / 2 - this.maxPolarAngle, Math.min(Math.PI / 2 - this.minPolarAngle, this.euler.x));

        // Apply the new rotation back to the camera
        this.camera.quaternion.setFromEuler(this.euler);

        // Game's updateCamera will handle positioning, this just handles rotation
        // Optionally, dispatch a change event if other systems need to react
        // this.dispatchEvent({ type: 'change' });
    },

    // Handle pointer lock state change
    onPointerlockChange: function() {
        if (document.pointerLockElement === this.domElement) {
            this.isLocked = true;
            console.log('PointerLockControls: Locked');
            // Optionally: Dispatch lock event
            // this.dispatchEvent({ type: 'lock' });
        } else {
            this.isLocked = false;
            console.log('PointerLockControls: Unlocked');
            // Optionally: Dispatch unlock event
            // this.dispatchEvent({ type: 'unlock' });
        }
        // Update Input's state too for consistency
        Input.pointerLock = this.isLocked;
    },

    // Handle pointer lock errors
    onPointerlockError: function() {
        console.error('PointerLockControls: Error while locking pointer.');
        this.isLocked = false;
        Input.pointerLock = this.isLocked;
    },

    // Request pointer lock
    lock: function() {
        if (!this.domElement) return;
        this.domElement.requestPointerLock = this.domElement.requestPointerLock ||
                                             this.domElement.mozRequestPointerLock ||
                                             this.domElement.webkitRequestPointerLock;

        if (this.domElement.requestPointerLock) {
            console.log("Requesting pointer lock via Controls...");
            this.domElement.requestPointerLock();
        } else {
            console.warn('PointerLockControls: Browser does not support Pointer Lock API on this element.');
        }
    },

    // Exit pointer lock
    unlock: function() {
        document.exitPointerLock = document.exitPointerLock ||
                                   document.mozExitPointerLock ||
                                   document.webkitExitPointerLock;

        if (document.exitPointerLock) {
             // Only exit if we are currently the locked element (or if no element is locked)
             // Avoids errors if called when not locked.
            if (document.pointerLockElement === this.domElement || document.pointerLockElement === null) {
                 console.log("Requesting pointer unlock via Controls...");
                 document.exitPointerLock();
            }
        } else {
             console.warn('PointerLockControls: Browser does not support exiting Pointer Lock.');
        }
         // Force state update immediately, don't wait for event
         this.isLocked = false;
         Input.pointerLock = this.isLocked;
    },

    // Clean up event listeners
    dispose: function() {
        this.disconnect();
    },


};