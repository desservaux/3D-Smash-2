# Block World Arena - Client

This is the client-side application for Block World Arena, a multiplayer voxel-based game built with ThreeJS.

## Project Structure

```
client/
├── src/                       # Source code
│   ├── assets/                # Static assets (textures, models, etc.)
│   │   └── textures/          # Texture files
│   ├── css/                   # CSS stylesheets
│   ├── engine/                # Game engine components
│   │   ├── core/              # Core engine functionality
│   │   ├── rendering/         # Rendering subsystem
│   │   └── world/             # World generation & management
│   └── js/                    # JavaScript application code
└── public/                    # Static HTML
    └── index.html             # Main HTML file
```

## Development

### Setup

```bash
npm install
```

### Running

```bash
npm run dev
```

This will start a development server. Open your browser to the URL shown in the terminal.

## Technologies

- Three.js for 3D rendering
- JavaScript (with plans to migrate to TypeScript)
- ES modules for code organization 