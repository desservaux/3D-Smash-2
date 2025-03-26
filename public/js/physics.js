/**
 * Physics handling for 3D SMASH Game
 */

const Physics = {
    world: null,
    timeStep: 1 / 60, // Target 60 FPS physics rate
    maxSubSteps: 5,   // Allow more substeps for stability with faster objects
    lastCallTime: null, // For variable timestep calculation

    init: function() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -19.62, 0); // Slightly stronger gravity (approx 2g)

        // Use SAPBroadphase for potentially better performance with many static objects
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);

        this.world.solver.iterations = 10; // More iterations for accuracy
        this.world.solver.tolerance = 0.001; // Lower tolerance
        // this.world.allowSleep = true; // Allow sleeping bodies for performance


        // --- Materials ---
        // Define materials - names are important for ContactMaterial lookup
        const groundMaterial = new CANNON.Material('ground'); // Used by World.js
        const characterMaterial = new CANNON.Material('character'); // Used by Character.js
        const dummyMaterial = new CANNON.Material('dummy'); // Used by createDummy

        // --- Contact Materials ---
        // Define interactions between materials

        // Character <-> Ground
        const groundCharacterContact = new CANNON.ContactMaterial(
            groundMaterial,
            characterMaterial,
            {
                friction: 0.1,      // Low friction - movement handled by forces/damping
                restitution: 0.0,   // No bounce
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3,
                // frictionEquationStiffness: 1e8, // Less important if friction is low
                // frictionEquationRelaxation: 3
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


        // Default contact material (if no specific pair is defined)
        this.world.defaultContactMaterial.friction = 0.1;
        this.world.defaultContactMaterial.restitution = 0.1;

        console.log('Physics world initialized');
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
    }
};