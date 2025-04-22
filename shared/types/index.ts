// Shared TypeScript interfaces and constants for both client and server

export interface IPlayerState {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface IChunkData {
  key: string;
  blocks: number[][][];
}

// Add more shared types as needed 