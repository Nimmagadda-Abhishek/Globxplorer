require('dotenv').config();

const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const morgan       = require('morgan');

const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

// Route imports
const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const leadRoutes         = require('./routes/leadRoutes');
const studentRoutes      = require('./routes/studentRoutes');
const documentRoutes     = require('./routes/documentRoutes');
const messageRoutes      = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes       = require('./routes/reportRoutes');
const followUpRoutes     = require('./routes/followUpRoutes');

// Cron job
const startFollowUpReminderJob = require('./jobs/followupReminderJob');

// ─── Connect to Database ────────────────────────────────────────────────────
connectDB();

// ─── App & HTTP Server ──────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── Socket.io ──────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : '*';

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Make io accessible inside controllers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌  Socket connected: ${socket.id}`);

  // Each authenticated user joins their own room using userId
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤  User ${userId} joined notification room`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌  Socket disconnected: ${socket.id}`);
  });
});

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// ─── General Middleware ──────────────────────────────────────────────────────
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'CRM API is running', timestamp: new Date() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/leads',         leadRoutes);
app.use('/api/students',      studentRoutes);
app.use('/api/documents',     documentRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/follow-ups',   followUpRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Cron Jobs ──────────────────────────────────────────────────────────
startFollowUpReminderJob(io);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀  CRM Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = { app, server };
