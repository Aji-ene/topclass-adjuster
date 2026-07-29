// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs-extra');

// Load environment variables
dotenv.config();

// Import routes
const claimsRoutes = require('./routes/claims');
const fileRoutes = require('./routes/files');
const collaborationRoutes = require('./routes/collaboration-routes');
const classBulletsRoutes = require('./routes/classBullets');


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data
app.use(morgan('dev')); // Logging

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Schedule cleanup of temp files (every 24 hours)
setInterval(() => {
  fs.emptyDir(uploadsDir)
    .then(() => console.log('Temporary files cleaned up'))
    .catch(err => console.error('Failed to clean up temp files:', err));
}, 24 * 60 * 60 * 1000);

// API Routes - IMPORTANT: These must come BEFORE the static file serving
app.use('/api/claims', claimsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/files', collaborationRoutes);
app.use('/api', classBulletsRoutes);

// Serve React build - This should come AFTER API routes
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all route for React SPA - This should be LAST
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
