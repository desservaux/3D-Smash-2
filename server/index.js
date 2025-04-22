const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

// Serve static files directly from the 'client' directory
// This includes index.html, css/, js/, etc.
app.use(express.static(path.join(__dirname, '..', 'client')));

// WebSocket connection handler
wss.on('connection', socket => {
  console.log('🕸️ client connected');

  // Send a message back to the client upon connection
  socket.send('Welcome to Block World Arena POC!');

  socket.on('message', data => {
      // Node.js Buffer to string conversion
      const messageString = data.toString('utf-8');
      console.log('← message from client:', messageString);

      // Example: Echo message back to the client
      socket.send(`Server received: ${messageString}`);
  });

  socket.on('close', () => console.log('🕸️ client disconnected'));
  socket.on('error', (error) => console.error('WebSocket Error:', error));
});

// Route for the root path - serve the client's index.html
app.get('/', (req, res) => {
  // Serve the index.html from the 'client/public' directory
  res.sendFile(path.join(__dirname, '..', 'client', 'public', 'index.html'));
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
  console.log('Open the web preview to see the application!');
});