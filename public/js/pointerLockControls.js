/**
 * Custom PointerLockControls implementation for first-person camera control
 * Based on the official Three.js PointerLockControls
 */

const PointerLockControls = {
    camera: null,
    domElement: null,
    isLocked: false,
    minPolarAngle: 0, // radians
    maxPolarAngle: Math.PI, // radians
    pointerSpeed: 1.0,
    
    // Event callbacks
    changeEvent: { type: 'change' },
    lockEvent: { type: 'lock' },
    unlockEvent: { type: 'unlock' },
    
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    
    // Initialize controls
    init: function(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || document.body;
        
        // Setup event listeners for pointer lock
        this.setupEventListeners();
        
        console.log('PointerLockControls initialized');
        return this;
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        this.onMouseMoveBound = this.onMouseMove.bind(this);
        this.pointerlockChangeBound = this.onPointerlockChange.bind(this);
        this.pointerlockErrorBound = this.onPointerlockError.bind(this);
        
        // Mouse move event
        document.addEventListener('mousemove', this.onMouseMoveBound);
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', this.pointerlockChangeBound);
        document.addEventListener('pointerlockerror', this.pointerlockErrorBound);
    },
    
    // Handle mouse movement
    onMouseMove: function(event) {
        if (!this.isLocked) return;
        
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        // Calculate rotation
        this.euler.setFromQuaternion(this.camera.quaternion);
        
        // Apply movement with sensitivity
        this.euler.y -= movementX * 0.002 * this.pointerSpeed;
        this.euler.x -= movementY * 0.002 * this.pointerSpeed;
        
        // Clamp to avoid flipping
        this.euler.x = Math.max(
            Math.PI / 2 - this.maxPolarAngle,
            Math.min(Math.PI / 2 - this.minPolarAngle, this.euler.x)
        );
        
        // Apply rotation to camera
        this.camera.quaternion.setFromEuler(this.euler);
        
        // Trigger change event
        this.dispatchEvent(this.changeEvent);
    },
    
    // Handle pointer lock change
    onPointerlockChange: function() {
        const wasLocked = this.isLocked;
        
        this.isLocked = document.pointerLockElement === this.domElement;
        
        // Dispatch appropriate event
        if (this.isLocked && !wasLocked) {
            this.dispatchEvent(this.lockEvent);
            console.log('PointerLockControls: Locked');
        } else if (!this.isLocked && wasLocked) {
            this.dispatchEvent(this.unlockEvent);
            console.log('PointerLockControls: Unlocked');
        }
    },
    
    // Handle pointer lock error
    onPointerlockError: function() {
        console.error('PointerLockControls: Error while locking pointer');
    },
    
    // Request pointer lock
    lock: function() {
        if (this.domElement.requestPointerLock) {
            this.domElement.requestPointerLock();
        } else {
            console.warn('PointerLockControls: Browser does not support PointerLock API');
        }
    },
    
    // Exit pointer lock
    unlock: function() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    },
    
    // Get camera direction
    getDirection: function(target) {
        target = target || new THREE.Vector3();
        
        // Calculate direction vector - look direction is -Z in local space
        const dir = new THREE.Vector3(0, 0, -1);
        return target.copy(dir).applyQuaternion(this.camera.quaternion);
    },
    
    // Move forward in direction of camera
    moveForward: function(distance) {
        // Create temp vector for movement
        const vec = new THREE.Vector3(0, 0, -1);
        
        // Apply only the Y rotation (yaw) to the movement vector
        vec.applyQuaternion(this.camera.quaternion);
        vec.y = 0; // Keep movement on xz plane
        vec.normalize();
        
        // Move the target
        this.camera.position.addScaledVector(vec, distance);
    },
    
    // Move right relative to camera direction
    moveRight: function(distance) {
        // Create temp vector for movement
        const vec = new THREE.Vector3(1, 0, 0);
        
        // Apply camera rotation to the movement vector
        vec.applyQuaternion(this.camera.quaternion);
        vec.y = 0; // Keep movement on xz plane
        vec.normalize();
        
        // Move the target
        this.camera.position.addScaledVector(vec, distance);
    },
    
    // Clean up event listeners
    dispose: function() {
        document.removeEventListener('mousemove', this.onMouseMoveBound);
        document.removeEventListener('pointerlockchange', this.pointerlockChangeBound);
        document.removeEventListener('pointerlockerror', this.pointerlockErrorBound);
    },
    
    // Simple event dispatcher
    dispatchEvent: function(event) {
        // In a real implementation, this would trigger registered event callbacks
        console.log('PointerLockControls event:', event.type);
        
        // For integration with Game.js
        if (event.type === 'change') {
            // Update the Game's camera rotation to match
            if (Game && Game.camera) {
                Game.cameraRotation.x = this.euler.x;
                Game.cameraRotation.y = this.euler.y;
            }
        }
    }
}; 