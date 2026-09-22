// AirSense IoT Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { requestLogger, errorHandler } = require('./middleware/errorHandler');

// Route imports
const readingRoutes   = require('./routes/readingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const nodeRoutes      = require('./routes/nodeRoutes');

const app = express();
const server = http.createServer(app);

// ──────────────────────────────────────────────
// Socket.IO setup (for real-time pushes)
// ──────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Make io available in controllers via app.locals
app.locals.io = io;

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = states[mongoose.connection.readyState] || 'unknown';
  res.json({
    success: true,
    message: 'AirSense IoT API is running',
    database: dbState,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ──────────────────────────────────────────────
// Database readiness check middleware
// ──────────────────────────────────────────────
const mongoose = require('mongoose');
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is connecting. Please ensure your current IP is whitelisted in MongoDB Atlas Network Access (or set to 0.0.0.0/0).',
      database: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    });
  }
  next();
});

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────
app.use('/api/nodes',      nodeRoutes);
app.use('/api/readings',   readingRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// ──────────────────────────────────────────────
// 404 handler
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ──────────────────────────────────────────────
// Centralized error handler
// ──────────────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  server.listen(PORT, () => {
    console.log(`\n🚀 AirSense IoT API running on port ${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
    // Connect to DB asynchronously without blocking or crashing the HTTP server
    connectDB();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use by another process.`);
    } else {
      console.error('❌ Server error:', err.message);
    }
  });
};

startServer();

