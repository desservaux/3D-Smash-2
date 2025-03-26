/**
 * Physics handling for 3D SMASH Game
 */

const Physics = {
    world: null,
    timeStep: 1/60,
    maxSubSteps: 3, // Add sub-steps for more stable physics
    
    // Initialize physics world
    init: function() {
        // Create physics world
        this.world = new CANNON.World();
        
        // Set gravity - reduced for better control
        this.world.gravity.set(0, -20, 0); // Increased gravity for better ground contact
        
        // Configure solver for better stability
        this.world.solver.iterations = 10;
        this.world.solver.tolerance = 0.01;
        
        // Broadphase algorithm
        this.world.broadphase = new CANNON.NaiveBroadphase();
        
        // Add contact material for better control
        const groundMaterial = new CANNON.Material('ground');
        const characterMaterial = new CANNON.Material('character');
        const dummyMaterial = new CANNON.Material('dummy');
        
        // Create contact material between ground and character
        const groundCharacterContactMaterial = new CANNON.ContactMaterial(
            groundMaterial,
            characterMaterial,
            {
                friction: 0.4,       // Lower friction for smoother movement
                restitution: 0.0,    // No bounce
                contactEquationStiffness: 1e8,  // More stable contact
                contactEquationRelaxation: 3    // More stable contact
            }
        );
        
        // Create contact material between dummy and ground
        const groundDummyContactMaterial = new CANNON.ContactMaterial(
            groundMaterial,
            dummyMaterial,
            {
                friction: 0.7,
                restitution: 0.3, // Slight bounce for the dummy
            }
        );
        
        // Add all contact materials
        this.world.addContactMaterial(groundCharacterContactMaterial);
        this.world.addContactMaterial(groundDummyContactMaterial);
        
        // Add default contact material for other contacts
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.1;
        
        console.log('Physics world initialized');
        return this.world;
    },
    
    // Create a test dummy object for knockback testing
    createDummy: function(scene, position) {
        // Create dummy object
        const dummyObject = {
            mesh: null,
            body: null
        };
        
        // Create mesh
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        dummyObject.mesh = new THREE.Mesh(geometry, material);
        dummyObject.mesh.position.copy(position);
        dummyObject.mesh.castShadow = true;
        scene.add(dummyObject.mesh);
        
        // Create physics body - smaller than visual for better collision
        const shape = new CANNON.Box(new CANNON.Vec3(0.4, 0.4, 0.4));
        dummyObject.body = new CANNON.Body({
            mass: 1,
            material: new CANNON.Material('dummy')
        });
        
        dummyObject.body.addShape(shape);
        dummyObject.body.position.set(position.x, position.y, position.z);
        dummyObject.body.linearDamping = 0.2; // Reduced to make knockback more effective
        dummyObject.body.angularDamping = 0.4;
        dummyObject.body.updateMassProperties(); // Make sure mass is distributed correctly
        
        this.world.addBody(dummyObject.body);
        
        return dummyObject;
    },
    
    // Reset a physics object to a specific position
    resetObject: function(object, position) {
        if (!object || !object.body) return;
        
        object.body.position.set(position.x, position.y, position.z);
        object.body.velocity.set(0, 0, 0);
        object.body.angularVelocity.set(0, 0, 0);
        object.body.force.set(0, 0, 0);
        object.body.torque.set(0, 0, 0);
    },
    
    // Update physics simulation
    update: function(deltaTime) {
        // Step the physics world with fixed timestep and substeps for more stability
        this.world.step(this.timeStep, deltaTime, this.maxSubSteps);
    },
    
    // Update an object's mesh to match its physics body
    updateObjectMesh: function(object) {
        if (!object || !object.mesh || !object.body) return;
        
        object.mesh.position.x = object.body.position.x;
        object.mesh.position.y = object.body.position.y;
        object.mesh.position.z = object.body.position.z;
        
        // Convert quaternion to Euler angles
        object.mesh.quaternion.x = object.body.quaternion.x;
        object.mesh.quaternion.y = object.body.quaternion.y;
        object.mesh.quaternion.z = object.body.quaternion.z;
        object.mesh.quaternion.w = object.body.quaternion.w;
    }
}; 