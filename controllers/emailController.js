/**
 * Email Controller
 * Handles all email-related business logic
 * Routes delegate to controller methods for clean separation of concerns
 */

const asyncHandler = require('express-async-handler');
const { sendOtpEmail } = require('../handlers/email/otpHandler');
const { sendDepositEmail } = require('../handlers/email/depositHandler');
const { sendWelcomeEmail } = require('../handlers/email/welcomeHandler');
const { sendAccountActivatedEmail } = require('../handlers/email/accountActivatedHandler');
const { sendAccountRejectedEmail } = require('../handlers/email/accountRejectedHandler');

/**
 * @desc    Send email based on type
 * @route   POST /api/email/send
 * @access  Public
 */
const sendEmail = asyncHandler(async (req, res) => {
  const { type } = req.body;

  let result;

  console.log("Received Request:", req.body);

  // Route to appropriate handler based on type
  switch (type) {
    case 'welcome':
      result = await handleWelcomeEmail(req.body);
      break;
    case 'deposit':
      result = await handleDepositEmail(req.body);
      break;
    case 'otp':
      result = await handleOtpEmail(req.body);
      break;
    case 'account-activated':
      result = await handleAccountActivatedEmail(req.body);
      break;
    case 'account-rejected':
      result = await handleAccountRejectedEmail(req.body);
      break;

    // Add more cases here for other email types
    // case 'welcome':
    //   result = await handleWelcomeEmail(req.body);
    //   break;
    // case 'password-reset':
    //   result = await handlePasswordResetEmail(req.body);
    //   break;

    default:
      return res.status(400).json({
        success: false,
        message: `Unsupported email type: ${type}`,
        statusCode: 400
      });
  }

  // Send response based on result
  if (result.success) {
    return res.status(200).json({
      success: true,
      message: result.message || 'Email sent successfully',
      data: {
        messageId: result.messageId,
        type: type
      },
      statusCode: 200
    });
  } else {
    
    return res.status(500).json({
      success: false,
      message: result.error || 'Failed to send email',
      statusCode: 500
    });
  }
});

/**
 * @desc    Get list of supported email types
 * @route   GET /api/email/types
 * @access  Public
 */
const getSupportedTypes = asyncHandler(async (req, res) => {
  const supportedTypes = [
    {
      type: 'otp',
      description: 'One-Time Password verification email',
      requiredFields: ['type', 'email', 'otpCode'],
      optionalFields: ['recipientName', 'expiryMinutes', 'purpose'],
      example: {
        type: 'otp',
        email: 'user@example.com',
        otpCode: '123456',
        recipientName: 'John Doe',
        expiryMinutes: 10,
        purpose: 'verify your account'
      }
    }
    // Add more types as they are implemented
  ];

  res.status(200).json({
    success: true,
    data: {
      count: supportedTypes.length,
      supportedTypes: supportedTypes
    },
    statusCode: 200
  });
});

/**
 * Handle OTP email sending
 * @private
 */
const handleOtpEmail = async (requestBody) => {
  try {
    const { email, otpCode, recipientName, expiryMinutes, purpose } = requestBody;

    // Prepare options for OTP handler
    const options = {
      recipientName,
      expiryMinutes,
      purpose
    };

    // Call the OTP handler with email, otpCode, and options
    const result = await sendOtpEmail(email, otpCode, options);

    return result;
  } catch (error) {
    console.error('OTP email controller error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process OTP email request'
    };
  }
};

// Add more handler functions for other email types
// /**
//  * Handle Welcome email sending
//  * @private
//  */
// const handleWelcomeEmail = async (requestBody) => {
//   try {
//     const { email, userName, loginUrl } = requestBody;
//     const result = await sendWelcomeEmail(email, userName, loginUrl);
//     return result;
//   } catch (error) {
//     console.error('Welcome email controller error:', error);
//     return {
//       success: false,
//       error: error.message || 'Failed to process welcome email request'
//     };
//   }
// };


const handleDepositEmail = async (requestBody) => {
  try {
    const { email, recipientName, amount, balance, date, maskedAccount } = requestBody;
    const result = await sendDepositEmail(email, { recipientName, amount, balance, date, maskedAccount });
    return result;
  } catch (error) {
    console.error('Deposit email controller error:', error);
    return { success: false, error: error.message || 'Failed to process deposit email request' };
  }
};

const handleWelcomeEmail = async (requestBody) => {
  try {
    const { email, recipientName, username, accountNo } = requestBody;
    const result = await sendWelcomeEmail(email, { recipientName, username, accountNo });
    return result;
  } catch (error) {
    console.error('Welcome email controller error:', error);
    return { success: false, error: error.message || 'Failed to process welcome email request' };
  }
};

const handleAccountActivatedEmail = async (requestBody) => {
  try {
    const { email, recipientName, username, accountNo } = requestBody;
    const result = await sendAccountActivatedEmail(email, { recipientName, username, accountNo });
    return result;
  } catch (error) {
    console.error('Account activated email controller error:', error);
    return { success: false, error: error.message || 'Failed to process email request' };
  }
};

const handleAccountRejectedEmail = async (requestBody) => {
  try {
    const { email, recipientName, reason } = requestBody;
    const result = await sendAccountRejectedEmail(email, { recipientName, reason });
    return result;
  } catch (error) {
    console.error('Account rejected email controller error:', error);
    return { success: false, error: error.message || 'Failed to process email request' };
  }
};

module.exports = {
  sendEmail,
  getSupportedTypes
};
