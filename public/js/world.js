/**
 * World generation and management for a block-based world
 */

const World = {
    size: 32,           // World size in blocks (e.g., 32x32 width/depth)
    height: 8,          // Max world height in blocks
    blockSize: 1,       // Size of each block in world units
    chunkSize: 16,      // Chunk size (for potential future optimization)

    worldData: {},      // Store block types { 'x,y,z': blockType }
    meshes: {},         // Store chunk meshes { 'chunkX,chunkZ': mesh }
    physicsBodies: {},  // Store physics bodies { 'x,y,z': body }

    sceneRef: null,
    physicsWorldRef: null,

    // Block types definition (example)
    BLOCK_TYPES: {
        AIR: 0,
        GRASS: 1,
        DIRT: 2,
        STONE: 3,
    },

    // Materials (cache materials)
    materials: {},

    // Create the initial world
    create: function(scene, world) {
        this.sceneRef = scene;
        this.physicsWorldRef = world;

        // Prepare materials using TextureManager
        this.prepareMaterials();

        console.log("Generating world data...");
        this.generateSimpleWorld(); // Generate the block data

        console.log("Creating world mesh and physics...");
        // For simplicity, initially create mesh/physics for the entire world as one "chunk"
        this.createWorldGeometryAndPhysics();

        // Add a grid helper (optional)
        // this.addGridHelper(scene);
        console.log("World created.");
    },

    prepareMaterials: function() {
        const grassTexture = TextureManager.get('grass');
        const dirtTexture = TextureManager.get('dirt');
        // Add more textures if needed (e.g., stone)
        // const stoneTexture = TextureManager.get('stone');

        // Ensure textures repeat correctly on larger faces if needed
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        dirtTexture.wrapS = THREE.RepeatWrapping;
        dirtTexture.wrapT = THREE.RepeatWrapping;

        // Create materials (can be multi-material later for different sides)
        this.materials[this.BLOCK_TYPES.GRASS] = new THREE.MeshStandardMaterial({ map: grassTexture });
        this.materials[this.BLOCK_TYPES.DIRT] = new THREE.MeshStandardMaterial({ map: dirtTexture });
        // Example for stone
        // this.materials[this.BLOCK_TYPES.STONE] = new THREE.MeshStandardMaterial({ map: stoneTexture });

        // Define ground material for physics
        const groundMaterial = new CANNON.Material('ground');
        groundMaterial.friction = 0.3; // Default friction for ground blocks
        groundMaterial.restitution = 0.0; // No bounce for ground blocks
        this.physicsGroundMaterial = groundMaterial;

        // We need to ensure the contact material between character and ground is set up
        // This should happen in Physics.init() - referencing the 'ground' material name.
    },

    // Generate simple flat terrain data
    generateSimpleWorld: function() {
        this.worldData = {}; // Clear previous data
        const halfSize = this.size / 2;

        for (let x = -halfSize; x < halfSize; x++) {
            for (let z = -halfSize; z < halfSize; z++) {
                const groundHeight = 1; // Flat ground at y=0
                // Place bedrock/stone layer (optional)
                // for (let y = 0; y < groundHeight - 3; y++) {
                //    this.setBlock(x, y, z, this.BLOCK_TYPES.STONE);
                // }
                // Place dirt layers
                for (let y = 0; y < groundHeight; y++) {
                    this.setBlock(x, y, z, this.BLOCK_TYPES.DIRT);
                }
                 // Place grass block on top
                 this.setBlock(x, groundHeight, z, this.BLOCK_TYPES.GRASS);
            }
        }
        console.log(`Generated world data with ${Object.keys(this.worldData).length} blocks.`);
    },

    // Create geometry and physics bodies for the generated world data
    // --- THIS IS A VERY INEFFICIENT METHOD ---
    // Creates one mesh and one physics body per block.
    // For larger worlds, geometry should be merged (greedy meshing)
    // and physics could use heightfields or fewer compound shapes.
    createWorldGeometryAndPhysics: function() {
        const blockGeometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        const physicsShape = new CANNON.Box(new CANNON.Vec3(this.blockSize / 2, this.blockSize / 2, this.blockSize / 2));

        // Use InstancedMesh for better rendering performance
        // Count max instances needed (worst case: all blocks visible)
        const maxInstances = this.size * this.size * this.height;
        const instancedMeshes = {}; // Store instanced mesh per material type

        let instanceCounters = {};

        const tempMatrix = new THREE.Matrix4();
        const tempObject = new THREE.Object3D(); // Helper for setting matrix


        for (const key in this.worldData) {
            const parts = key.split(',');
            const x = parseInt(parts[0]);
            const y = parseInt(parts[1]);
            const z = parseInt(parts[2]);
            const blockType = this.worldData[key];

            if (blockType === this.BLOCK_TYPES.AIR) continue;

            // --- Check for exposed faces --- VERY BASIC culling
            // Only render/physicize blocks that have at least one air neighbor
            if (
                this.getBlock(x + 1, y, z) === this.BLOCK_TYPES.AIR ||
                this.getBlock(x - 1, y, z) === this.BLOCK_TYPES.AIR ||
                this.getBlock(x, y + 1, z) === this.BLOCK_TYPES.AIR ||
                this.getBlock(x, y - 1, z) === this.BLOCK_TYPES.AIR ||
                this.getBlock(x, y, z + 1) === this.BLOCK_TYPES.AIR ||
                this.getBlock(x, y, z - 1) === this.BLOCK_TYPES.AIR
            ) {

                // --- Graphics Mesh (Instanced) ---
                const material = this.materials[blockType];
                if (!material) continue; // Skip if no material defined

                if (!instancedMeshes[blockType]) {
                    instancedMeshes[blockType] = new THREE.InstancedMesh(blockGeometry, material, maxInstances);
                    instancedMeshes[blockType].castShadow = true;
                    instancedMeshes[blockType].receiveShadow = true;
                    this.sceneRef.add(instancedMeshes[blockType]);
                    instanceCounters[blockType] = 0;
                }

                const instanceIndex = instanceCounters[blockType]++;
                if (instanceIndex < maxInstances) {
                     // Calculate position centered on grid cell
                     const meshX = x * this.blockSize + this.blockSize / 2;
                     const meshY = y * this.blockSize + this.blockSize / 2;
                     const meshZ = z * this.blockSize + this.blockSize / 2;
                     tempObject.position.set(meshX, meshY, meshZ);
                     tempObject.updateMatrix();
                     instancedMeshes[blockType].setMatrixAt(instanceIndex, tempObject.matrix);
                }


                // --- Physics Body ---
                const body = new CANNON.Body({
                    mass: 0, // Static
                    shape: physicsShape,
                    material: this.physicsGroundMaterial // Use the shared ground material
                });

                 // Position physics body at the center of the block
                 body.position.set(
                     x * this.blockSize + this.blockSize / 2,
                     y * this.blockSize + this.blockSize / 2,
                     z * this.blockSize + this.blockSize / 2
                 );

                this.physicsWorldRef.addBody(body);
                this.physicsBodies[key] = body; // Store reference if needed later
            }
        }

         // Update instance counts and matrices
         for(const type in instancedMeshes) {
             instancedMeshes[type].count = instanceCounters[type];
             instancedMeshes[type].instanceMatrix.needsUpdate = true;
             console.log(`Created InstancedMesh for type ${type} with ${instanceCounters[type]} instances.`);
         }

        // Dispose of the template geometry
        blockGeometry.dispose();
    },


    // Helper to set a block type in world data
    setBlock: function(x, y, z, type) {
        const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
        if (type === this.BLOCK_TYPES.AIR) {
            delete this.worldData[key]; // Remove air blocks to save space
        } else {
            this.worldData[key] = type;
        }
        // TODO: Need to update mesh/physics if changed dynamically
    },

    // Helper to get a block type from world data
    getBlock: function(x, y, z) {
        const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
        return this.worldData[key] || this.BLOCK_TYPES.AIR; // Default to air
    },

    // Get a suitable spawn position (e.g., center top block)
    getSpawnPosition: function() {
         // Find the highest block at x=0, z=0
         let highestY = -1;
         const halfSize = this.size / 2;
         for (let y = this.height; y >= -1; y--) {
              if (this.getBlock(0, y, 0) !== this.BLOCK_TYPES.AIR) {
                  highestY = y;
                  break;
              }
         }
        // Spawn slightly above the highest block's center
        const spawnX = 0 * this.blockSize + this.blockSize / 2;
        const spawnY = (highestY + 1) * this.blockSize; // Player origin is at feet
        const spawnZ = 0 * this.blockSize + this.blockSize / 2;

        // Add small offset if needed to prevent spawning inside ground
        return new THREE.Vector3(spawnX, spawnY + 0.1, spawnZ);
    },

    addGridHelper: function(scene) {
        const gridHelper = new THREE.GridHelper(this.size * this.blockSize, this.size, 0x444444, 0x888888);
        gridHelper.position.y = 0.01; // Slightly above y=0 plane
        scene.add(gridHelper);
    },

    update: function(deltaTime) {
        // Potential future updates:
        // - Load/unload chunks
        // - Animate textures
    }
};