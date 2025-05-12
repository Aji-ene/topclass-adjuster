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
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Scheduled cleanup
setInterval(() => {
  fs.emptyDir(uploadsDir)
    .then(() => console.log('Temporary files cleaned up'))
    .catch(err => console.error('Failed to clean up temp files:', err));
}, 24 * 60 * 60 * 1000);

// API Routes (must come BEFORE React catch-all)
app.use('/api/claims', claimsRoutes);
app.use('/api/files', fileRoutes);

// Basic root route
app.get('/', (req, res) => {
  res.send('Topclass Adjuster API is live');
});

// Serve React build (must come AFTER API routes)
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handler
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
