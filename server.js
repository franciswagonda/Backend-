const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(helmet()); // Security headers

// Logging (skip in test)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.LOG_FORMAT || 'combined'));
}

// Rate Limiting (adjust window/max via env)
const apiLimiter = rateLimit({
    windowMs: (process.env.RATE_WINDOW_MINUTES || 15) * 60 * 1000,
    max: process.env.RATE_MAX_REQUESTS || 1000, // Increased for development
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const db = require('./models');

// Database Connection & Sync
const alterSync = process.env.DB_SYNC_ALTER === 'true';
db.sequelize.sync({ alter: alterSync })
    .then(() => console.log(`Database connected and synced (alter=${alterSync})...`))
    .catch(err => console.log('Error: ' + err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes')); // admin-only user management
app.use('/api', require('./routes/facultyRoutes')); // faculty and department endpoints

// Static uploads
app.use('/uploads', express.static('uploads'));

// Root health/info endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', name: 'UCU Innovators Hub API', env: process.env.NODE_ENV || 'development' });
});

// Centralized basic error handler (fallback)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
