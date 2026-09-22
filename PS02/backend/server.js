import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { populateSeedData } from './utils/seedData.js';

import nodeRoutes from './routes/nodeRoutes.js';
import readingRoutes from './routes/readingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import heatmapRoutes from './routes/heatmapRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow any origin in dev (localhost, 127.0.0.1, LAN IPs, or tools like curl)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// System Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Heatwaves & Edge AI System',
    hardware: 'Arduino UNO Q (Qualcomm Dragonwing QRB2210 + STM32U585)',
    offlineResilient: true,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/nodes', nodeRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/heatmap', heatmapRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Start Server after Database connection
const startServer = async () => {
  try {
    await connectDB();
    await populateSeedData();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`Heatwaves & Edge AI Backend running on port ${PORT}`);
      console.log(`Arduino UNO Q Local Edge Intelligence Server Ready`);
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
