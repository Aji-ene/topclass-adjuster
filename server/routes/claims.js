// server/routes/claims.js
const express = require('express');
const router = express.Router();
const claimsController = require('../controllers/claimsController'); // We'll create this next

// Routes for claims-related operations

/**
 * @route POST /api/claims/analyze
 * @desc Analyze uploaded files and generate claim analysis
 * @access Public (add authentication in production)
 */
router.post('/analyze', claimsController.analyzeClaim);

/**
 * @route GET /api/claims/report/:reportId
 * @desc Get specific claim report details
 * @access Public (add authentication in production)
 */
router.get('/report/:reportId', claimsController.getReport);

/**
 * @route POST /api/claims/convert-report
 * @desc Convert existing report to specified format
 * @access Public (add authentication in production)
 */
router.post('/convert-report', claimsController.convertReportFormat);

module.exports = router;


