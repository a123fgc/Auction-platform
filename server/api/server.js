// api/server.js
const { createServer } = require('http');
const app = require('../src/app'); // Aapka existing Express app
const { initSocket } = require('../src/sockets'); // Aapka socket init function

const server = createServer(app);

// Socket.IO ko is server par attach karein
initSocket(server);

// Vercel ko exported server chahiye, listen nahi karna
module.exports = server;