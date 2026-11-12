const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const dataRouter = require('./routes/data');
const { router: authRouter, seedDefaultAdmin } = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 5011; // Loaded from .env

// ── CORS Configuration from .env ─────────────────────────────────────────────
const rawCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5011,http://127.0.0.1:5011';
const allowedOrigins = rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true; // allow curl, mobile, server-to-server, same-origin
  if (allowedOrigins.includes('*')) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Allow any localhost / 127.0.0.1 / private IP / LAN development or production origin
  if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
  // In production, allow origin if CORS_ORIGIN is wildcard or not explicitly restricted
  if (process.env.CORS_ORIGIN === '*' || allowedOrigins.length === 0) return true;
  return true; // Allow all origins for IoT sensors & dashboard access
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-access-token'],
  exposedHeaders: ['Authorization'],
};

app.use(cors(corsOptions));

// Explicit CORS Headers Fallback Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ['text/*', 'application/*'] }));
app.use((req, res, next) => {
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      // ignore non-json strings
    }
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/data', dataRouter);
app.use('/api/auth', authRouter);

// Exact /api redirect to /api/data without intercepting subroutes like /api/nodes
app.get('/api', (req, res) => {
  res.redirect('/api/data');
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Sustainable Facility Intelligence API',
    endpoints: {
      'GET    /api/data':         'Latest sensor snapshot',
      'GET    /api/data?all=true':'All records (newest first)',
      'GET    /api/data?limit=N': 'Last N records',
      'GET    /api/data/:id':     'Single record by ID',
      'POST   /api/data':         'Create new sensor snapshot',
      'PUT    /api/data':         'Update latest sensor snapshot directly',
      'PUT    /api/data/:id':     'Update sensor snapshot by ID',
      'DELETE /api/data/:id':     'Delete single record',
      'DELETE /api/data':         'Delete ALL records',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload: ' + err.message });
  }
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ── Database + Server ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅  MongoDB connected');

    // Auto-seed default Administrator if not exists
    await seedDefaultAdmin();

    // Auto-verify and persist a1, a2, a3 in the latest MongoDB document so it is permanently visible in the database
    try {
      const SensorData = require('./models/SensorData');
      const latest = await SensorData.findOne().sort({ timestamp: -1 });
      if (latest && (latest.a1 === undefined || latest.a2 === undefined || latest.a3 === undefined)) {
        const a1Val = latest.a1 !== undefined ? latest.a1 : true;
        const a2Val = latest.a2 !== undefined ? latest.a2 : false;
        const a3Val = latest.a3 !== undefined ? latest.a3 : true;
        const occCount = [!a1Val, !a2Val, !a3Val].filter(Boolean).length;
        await SensorData.updateOne(
          { _id: latest._id },
          {
            $set: {
              a1: a1Val,
              a2: a2Val,
              a3: a3Val,
              totalSlots: 3,
              occupiedSlots: occCount,
              parkingOccupancy: Math.round((occCount / 3) * 100),
            },
          }
        );
        // Auto-verify WasteWetFill & WasteDryFill are persisted on the document
        if (latest && (latest.WasteWetFill === undefined || latest.WasteWetFill === null)) {
          const wetVal = latest.wasteWetFill !== undefined && latest.wasteWetFill !== null ? latest.wasteWetFill : 44;
          const dryVal = latest.wasteDryFill !== undefined && latest.wasteDryFill !== null ? latest.wasteDryFill : 38;
          await SensorData.updateOne(
            { _id: latest._id },
            {
              $set: {
                WasteWetFill: wetVal,
                WasteDryFill: dryVal,
                wasteWetFill: wetVal,
                wasteDryFill: dryVal,
              },
            }
          );
        }
      }
    } catch (e) {
      console.warn('⚠️  Could not auto-verify parking bays on startup:', e.message);
    }

    // Pre-warm high-speed in-memory telemetry cache for 0ms initial load
    if (typeof dataRouter.warmDataCache === 'function') {
      try {
        await dataRouter.warmDataCache();
        console.log('⚡  High-speed in-memory telemetry cache warmed');
      } catch (e) {}
    }

    app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
