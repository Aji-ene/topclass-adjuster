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

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Logging

// Serve React build
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});



// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Schedule cleanup of temp files (every 24 hours)
setInterval(() => {
  fs.emptyDir(uploadsDir)
    .then(() => console.log('Temporary files cleaned up'))
    .catch(err => console.error('Failed to clean up temp files:', err));
}, 24 * 60 * 60 * 1000);

// Routes
app.use('/api/claims', claimsRoutes);
app.use('/api/files', fileRoutes);

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





const filesRoutes = require('./routes/files');

// Middleware to parse JSON
app.use(express.json());

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Mount the routes
app.use('/api/files', filesRoutes);

// Start the server

