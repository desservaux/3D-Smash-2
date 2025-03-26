/**
 * Island generation for 3D SMASH Game
 */

const Island = {
    mesh: null,
    body: null,
    size: 20, // Size of the island in blocks
    blockSize: 1, // Size of each block
    
    // Create the island mesh and physics body
    create: function(scene, world) {
        // Calculate dimensions
        const width = this.size;
        const depth = this.size;
        const height = 5;
        
        // Create island geometry (simple box for now)
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        // Create materials for different sides
        const materials = [
            new THREE.MeshStandardMaterial({ map: TextureManager.get('dirt') }), // Right side
            new THREE.MeshStandardMaterial({ map: TextureManager.get('dirt') }), // Left side
            new THREE.MeshStandardMaterial({ map: TextureManager.get('grass') }), // Top side
            new THREE.MeshStandardMaterial({ map: TextureManager.get('dirt') }), // Bottom side
            new THREE.MeshStandardMaterial({ map: TextureManager.get('dirt') }), // Front side
            new THREE.MeshStandardMaterial({ map: TextureManager.get('dirt') })  // Back side
        ];
        
        // Create mesh with geometry and materials
        this.mesh = new THREE.Mesh(geometry, materials);
        
        // Position the mesh so its top surface is at y=0 (ground level)
        this.mesh.position.set(0, -height/2, 0);
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        
        // Create physics body for the island
        const groundShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        this.body = new CANNON.Body({
            mass: 0 // Static body (mass = 0)
        });
        
        this.body.addShape(groundShape);
        
        // Position the body to match the mesh
        this.body.position.set(0, -height/2, 0);
        
        world.addBody(this.body);
        
        // Add a grid helper to visualize the ground plane
        this.addGridHelper(scene);
        
        return this.mesh;
    },
    
    // Add a grid helper to visualize where the ground plane is
    addGridHelper: function(scene) {
        const gridHelper = new THREE.GridHelper(this.size, this.size, 0x444444, 0x888888);
        
        // Position the grid on the surface of the island (y=0)
        gridHelper.position.y = 0.01; // Slightly above the surface to avoid z-fighting
        
        scene.add(gridHelper);
    },
    
    // Get the spawn position on the island
    getSpawnPosition: function() {
        return new THREE.Vector3(0, 0, 0); // Spawn in the center, on the surface (y=0)
    },
    
    // Update the island (if needed for animations, etc.)
    update: function(deltaTime) {
        // No updates needed for a static island
    }
}; 