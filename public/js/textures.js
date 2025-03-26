/**
 * Texture management for 3D SMASH Game
 */

const TextureManager = {
    textures: {},
    loader: new THREE.TextureLoader(),
    
    // Generate a simple grass texture procedurally
    generateGrassTexture: function() {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        
        // Draw grass top
        ctx.fillStyle = '#5ab552'; // Grass green
        ctx.fillRect(0, 0, size, size);
        
        // Add some variation
        for (let i = 0; i < 32; i++) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            const color = Math.random() > 0.5 ? '#63c74d' : '#3f8f3d';
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        this.textures['grass'] = texture;
        return texture;
    },
    
    // Generate a simple dirt texture procedurally
    generateDirtTexture: function() {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        
        // Draw dirt base
        ctx.fillStyle = '#8b6b4c'; // Dirt brown
        ctx.fillRect(0, 0, size, size);
        
        // Add some variation
        for (let i = 0; i < 32; i++) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            const color = Math.random() > 0.5 ? '#6e5339' : '#9c7855';
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        this.textures['dirt'] = texture;
        return texture;
    },
    
    // Generate a simple character skin texture
    generateCharacterTexture: function() {
        const size = 128; // Even higher resolution for more detail
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        
        // Use a proper UV layout for a Minecraft-like character
        
        // Draw head - top of texture
        const headSize = size/4;
        ctx.fillStyle = '#c68863'; // Skin tone
        ctx.fillRect(size/4, 0, headSize, headSize); // Head 
        
        // Face details
        ctx.fillStyle = '#000000';
        // Left eye
        ctx.fillRect(size/4 + headSize/3, headSize/3, headSize/8, headSize/8);
        // Right eye
        ctx.fillRect(size/4 + headSize*2/3, headSize/3, headSize/8, headSize/8);
        // Mouth
        ctx.fillRect(size/4 + headSize/3, headSize*2/3, headSize/3, headSize/12);
        
        // Hair
        ctx.fillStyle = '#4a3623';
        ctx.fillRect(size/4, 0, headSize, headSize/6);
        
        // Torso - blue shirt 
        ctx.fillStyle = '#3b5dc9';
        ctx.fillRect(size/4, headSize, headSize, headSize*1.5);
        
        // Arms
        // Left arm (sleeve)
        ctx.fillStyle = '#3b5dc9';
        ctx.fillRect(0, headSize, headSize/2, headSize);
        
        // Left arm (hand)
        ctx.fillStyle = '#c68863';
        ctx.fillRect(0, headSize*2, headSize/2, headSize/2);
        
        // Right arm (sleeve)
        ctx.fillStyle = '#3b5dc9';
        ctx.fillRect(size/4 + headSize*1.5, headSize, headSize/2, headSize);
        
        // Right arm (hand)
        ctx.fillStyle = '#c68863';
        ctx.fillRect(size/4 + headSize*1.5, headSize*2, headSize/2, headSize/2);
        
        // Pants and legs
        ctx.fillStyle = '#4a80ad'; // Blue jeans
        ctx.fillRect(size/4, headSize*2.5, headSize, headSize*1.5);
        
        // Shoes
        ctx.fillStyle = '#473727'; // Brown shoes
        ctx.fillRect(size/4, headSize*3.5, headSize, headSize/2);
        
        // Button details on shirt
        ctx.fillStyle = '#f8d742'; // Gold buttons
        const buttonRadius = headSize/16;
        const buttonX = size/4 + headSize/2;
        let buttonY = headSize + headSize/4;
        const buttonSpacing = headSize/3;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(buttonX, buttonY + i * buttonSpacing, buttonRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        this.textures['character'] = texture;
        return texture;
    },
    
    // Initialize all textures
    init: function() {
        this.generateGrassTexture();
        this.generateDirtTexture();
        this.generateCharacterTexture();
        console.log('Textures initialized');
    },
    
    // Get a texture by name
    get: function(name) {
        return this.textures[name];
    }
}; 