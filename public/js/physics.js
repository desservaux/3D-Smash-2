/**
 * Physics handling for 3D SMASH Game
 */

const Physics = {
    world: null,
    timeStep: 1 / 60, // Target 60 FPS physics rate
    maxSubSteps: 5,   // Allow more substeps for stability with faster objects
    lastCallTime: null, // For variable timestep calculation
    debugBodies: [], // Store debug meshes

    init: function() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -15.0, 0); // Slightly reduced gravity for better control

        // Use SAPBroadphase for potentially better performance with many static objects
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);

        // Configure physics solver for better stability
        this.world.solver.iterations = 20; // More iterations for better stability
        this.world.solver.tolerance = 0.001; // Lower tolerance
        
        // Configure for more reliable collision detection
        this.world.defaultContactMaterial.contactEquationStiffness = 1e7;
        this.world.defaultContactMaterial.contactEquationRelaxation = 4;
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.0;

        // By default, all collision groups should interact
        // Group 1: Static world (ground, walls, etc)
        // Group 2: Character
        // Group 3: Dynamic objects (e.g., dummy)
        
        // All groups should collide with all other groups by default
        const allGroups = -1; // Bitmask 11111111 in binary - collide with everything

        // --- Materials ---
        // Define materials - names are important for ContactMaterial lookup
        const groundMaterial = new CANNON.Material('ground'); 
        const characterMaterial = new CANNON.Material('character');
        const dummyMaterial = new CANNON.Material('dummy');

        // --- Contact Materials ---
        // Character <-> Ground
        const groundCharacterContact = new CANNON.ContactMaterial(
            groundMaterial,
            characterMaterial,
            {
                friction: 0.2,      // Lower friction to prevent snagging
                restitution: 0.0,   // No bounce
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 4
            }
        );
        this.world.addContactMaterial(groundCharacterContact);

        // Dummy <-> Ground
        const groundDummyContact = new CANNON.ContactMaterial(
            groundMaterial,
            dummyMaterial,
            {
                friction: 0.4,
                restitution: 0.3, // Slight bounce
            }
        );
        this.world.addContactMaterial(groundDummyContact);

         // Character <-> Dummy (for punching)
         const characterDummyContact = new CANNON.ContactMaterial(
             characterMaterial,
             dummyMaterial,
             {
                 friction: 0.1,
                 restitution: 0.5, // Allow some bounce when hit
             }
         );
         this.world.addContactMaterial(characterDummyContact);

        console.log('Physics world initialized with collision groups');
        return this.world;
    },

    // createDummy (adjust material name if needed)
    createDummy: function(scene, position) {
        const dummyObject = { mesh: null, body: null };
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        dummyObject.mesh = new THREE.Mesh(geometry, material);
        dummyObject.mesh.position.copy(position);
        dummyObject.mesh.castShadow = true;
        scene.add(dummyObject.mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(0.4, 0.4, 0.4));
        // *** Ensure material name matches definition in init() ***
        const dummyMaterial = this.world.materials.find(m => m.name === 'dummy') || new CANNON.Material('dummy');

        dummyObject.body = new CANNON.Body({
            mass: 10, // Give it some mass
            material: dummyMaterial,
            linearDamping: 0.3, // Some air resistance
            angularDamping: 0.5
        });
        dummyObject.body.addShape(shape);
        dummyObject.body.position.copy(position);
        dummyObject.body.updateMassProperties();
        this.world.addBody(dummyObject.body);
        return dummyObject;
    },

    resetObject: function(object, position) { // Keep unchanged
        if (!object || !object.body) return;
        object.body.position.copy(position);
        object.body.velocity.set(0, 0, 0);
        object.body.angularVelocity.set(0, 0, 0);
        object.body.force.set(0, 0, 0);
        object.body.torque.set(0, 0, 0);
        // object.body.wakeUp(); // Ensure it's active
    },

    // Update physics simulation using variable timestep
    update: function(deltaTime) {
        // Use the deltaTime passed from the game loop
        if (this.world && deltaTime > 0) {
            // Use fixed timestep internally for stability
            this.world.step(this.timeStep, deltaTime, this.maxSubSteps);
        }
    },

    // updateObjectMesh (unchanged)
    updateObjectMesh: function(object) {
        if (!object || !object.mesh || !object.body) return;
        // Uselerp for smoother visual updates (optional, adds slight visual lag)
        // object.mesh.position.lerp(object.body.position, 0.5);
        // object.mesh.quaternion.slerp(object.body.quaternion, 0.5);
        object.mesh.position.copy(object.body.position);
        object.mesh.quaternion.copy(object.body.quaternion);
    },

    // Add a method to create debug visualizations for physics bodies
    createDebugBody: function(scene, body, color = 0x00ff00) {
        const shape = body.shapes[0]; // Get the first shape for simplicity
        
        if (!shape) return null;
        
        let geometry;
        let mesh;
        
        // Create geometry based on shape type
        if (shape instanceof CANNON.Box) {
            // Use half-extents for BoxGeometry
            geometry = new THREE.BoxGeometry(
                shape.halfExtents.x * 2,
                shape.halfExtents.y * 2,
                shape.halfExtents.z * 2
            );
            const material = new THREE.MeshBasicMaterial({ 
                color: color, 
                wireframe: true,
                opacity: 0.3,
                transparent: true
            });
            mesh = new THREE.Mesh(geometry, material);
            
            // Account for shape offset if any
            if (body.shapeOffsets && body.shapeOffsets.length > 0) {
                const offset = body.shapeOffsets[0];
                mesh.position.set(offset.x, offset.y, offset.z);
            }
            
            const debugObj = {
                body: body,
                mesh: mesh
            };
            
            scene.add(mesh);
            this.debugBodies.push(debugObj);
            return debugObj;
        }
        
        return null;
    },
    
    // Method to update debug body visualizations
    updateDebugBodies: function() {
        for (const debugObj of this.debugBodies) {
            if (debugObj.body && debugObj.mesh) {
                // Update position
                debugObj.mesh.position.copy(debugObj.body.position);
                if (debugObj.body.shapeOffsets && debugObj.body.shapeOffsets.length > 0) {
                    const offset = debugObj.body.shapeOffsets[0];
                    // Apply local offset to global position
                    debugObj.mesh.position.x += offset.x;
                    debugObj.mesh.position.y += offset.y;
                    debugObj.mesh.position.z += offset.z;
                }
                
                // Update rotation
                debugObj.mesh.quaternion.copy(debugObj.body.quaternion);
            }
        }
    }
};