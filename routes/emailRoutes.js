/**
 * Email Routes
 * Clean routes with no business logic - all logic handled by controller
 */

const express = require('express');
const router = express.Router();
const { validateEmailRequest } = require('../validators/emailValidator');
const emailController = require('../controllers/emailController');

/**
 * POST /api/email/send
 * Send email based on type
 * Validation -> Controller
 */
router.post('/send', validateEmailRequest, emailController.sendEmail);

/**
 * GET /api/email/types
 * Get list of supported email types
 * Controller only
 */
router.get('/types', emailController.getSupportedTypes);

module.exports = router;
