import { Game } from './engine/core/Game';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container') || createGameContainer();
  const game = new Game(container);
  game.init();
});

function createGameContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'game-container';
  container.style.width = '100vw';
  container.style.height = '100vh';
  document.body.appendChild(container);
  return container;
} 