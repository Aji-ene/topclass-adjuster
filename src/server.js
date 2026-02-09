// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const filesRouter = require('./routes/files');

// Use routes
app.use('/api/files', filesRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Topclass Adjusters Claims Processing API',
    version: '2.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📝 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`\n🔑 Required Environment Variables:`);
  console.log(`   - ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   - XAI_API_KEY: ${process.env.XAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Missing'}`);
});

module.exports = app;
