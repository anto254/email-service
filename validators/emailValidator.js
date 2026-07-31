/**
 * Email Request Validators
 * Validates incoming email requests based on type
 */

/**
 * Validate OTP email request
 * @param {Object} body - Request body
 * @returns {Object} Validation result
 */
const validateOtpRequest = (body) => {
  const { type, email, otpCode, recipientName, expiryMinutes, purpose } = body;
  const errors = [];

  // Check required fields
  if (!type || type !== 'otp') {
    errors.push('Type must be "otp"');
  }

  if (!email) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!otpCode) {
    errors.push('OTP code is required');
  } else if (typeof otpCode !== 'string' && typeof otpCode !== 'number') {
    errors.push('OTP code must be a string or number');
  }

  // Optional field validation
  if (recipientName && typeof recipientName !== 'string') {
    errors.push('Recipient name must be a string');
  }

  if (expiryMinutes !== undefined) {
    const expiry = Number(expiryMinutes);
    if (isNaN(expiry) || expiry <= 0) {
      errors.push('Expiry minutes must be a positive number');
    }
  }

  if (purpose && typeof purpose !== 'string') {
    errors.push('Purpose must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Helper function to validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
const validateDepositRequest = (body) => {
  const { type, email, recipientName, amount, balance, date, maskedAccount } = body;
  const errors = [];

  if (!type || type !== 'deposit') errors.push('Type must be "deposit"');
  if (!email) errors.push('Email is required');
  else if (!isValidEmail(email)) errors.push('Invalid email format');
  if (!amount) errors.push('Amount is required');

  return { isValid: errors.length === 0, errors };
};

const validateWelcomeRequest = (body) => {
  const { type, email, recipientName, username, accountNo } = body;
  const errors = [];
  if (!type || type !== 'welcome') errors.push('Type must be "welcome"');
  if (!email) errors.push('Email is required');
  else if (!isValidEmail(email)) errors.push('Invalid email format');
  return { isValid: errors.length === 0, errors };
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Middleware to validate email requests based on type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateEmailRequest = (req, res, next) => {
  const { type } = req.body;

  // Validate type field exists
  if (!type) {
    return res.status(400).json({
      success: false,
      message: 'Email type is required',
      statusCode: 400
    });
  }

  // Route to appropriate validator based on type
  let validationResult;

  switch (type) {
    case 'welcome':
      validationResult = validateWelcomeRequest(req.body);
      break;
    case 'deposit':
      validationResult = validateDepositRequest(req.body);
      break;
    case 'otp':
      validationResult = validateOtpRequest(req.body);
      break;
    // Add more cases here for other email types
    default:
      return res.status(400).json({
        success: false,
        message: `Unsupported email type: ${type}`,
        statusCode: 400
      });
  }

  // Check validation result
  if (!validationResult.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationResult.errors,
      statusCode: 400
    });
  }

  // Validation passed, continue to route handler
  next();
};

module.exports = {
  validateEmailRequest,
  validateOtpRequest,
  validateDepositRequest,
  validateWelcomeRequest,
  isValidEmail
};
