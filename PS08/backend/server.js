require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
require('./config/cloudinary'); // Initialize Cloudinary config

const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const esgRoutes = require('./routes/esgRoutes');
const brsrRoutes = require('./routes/brsrRoutes');
const documentRoutes = require('./routes/documentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Connect to MongoDB
connectDB();

// Register all Mongoose models
require('./models');

const app = express();

// Disable ETag caching to ensure API always responds with 200 instead of 304
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// Robust CORS configuration supporting localhost, Vercel deployments, and production URLs
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://ps08.vercel.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, curl, postman, server-to-server)
    if (!origin) return callback(null, true);

    const envOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
      : [];

    if (
      allowedOrigins.includes(origin) ||
      envOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    // Default to true in production/hackathon environments so Vercel preview or alternate URLs work
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const path = require('path');
// Static uploads directory for fallback storage
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ESG360 API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/esg', esgRoutes);
app.use('/api/brsr', brsrRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Sync Super Admin credentials if specified in environment variables
const syncSuperAdmin = async () => {
  try {
    const User = require('./models/User');
    const adminEmail = process.env.SUPERADMIN_EMAIL;
    const adminPass = process.env.SUPERADMIN_PASSWORD;

    if (adminEmail || adminPass) {
      const admin = await User.findOne({ role: 'Super Admin' }).select('+password');
      if (admin) {
        if (adminEmail && admin.email !== adminEmail.trim().toLowerCase()) {
          admin.email = adminEmail.trim().toLowerCase();
        }
        if (adminPass) {
          admin.password = adminPass;
        }
        await admin.save();
        console.log(`🔐 Super Admin synchronized from env: ${admin.email}`);
      }
    }
  } catch (err) {
    console.error('Super Admin sync notice:', err.message);
  }
};

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`\n🌿 ESG360 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api\n`);
    await syncSuperAdmin();
  });
}

module.exports = app;
