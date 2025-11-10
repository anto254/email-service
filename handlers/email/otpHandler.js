/**
 * OTP Email Handler
 * Handles sending OTP verification emails
 */

const emailService = require('../../services/emailService');
const emailConfig = require('../../config/emailConfig');
const { generateOtpEmail } = require('../../templates/email/otpTemplate');

/**
 * Send OTP verification email
 * @param {string} email - Recipient email address
 * @param {string} otpCode - OTP code to send
 * @param {Object} options - Additional options
 * @param {string} options.recipientName - Recipient's name (optional)
 * @param {number} options.expiryMinutes - OTP expiry time in minutes (optional)
 * @param {string} options.purpose - Purpose of OTP (optional)
 * @returns {Promise<Object>} Result of email sending operation
 */
const sendOtpEmail = async (email, otpCode, options = {}) => {
  try {
    // Validate inputs
    if (!email || !otpCode) {
      return {
        success: false,
        error: 'Email and OTP code are required'
      };
    }

    // Prepare email options
    const emailOptions = {
      recipientName: options.recipientName || 'User',
      expiryMinutes: options.expiryMinutes || emailConfig.defaultOtpExpiryMinutes,
      purpose: options.purpose || 'verify your account'
    };

    // Generate email content from template
    const htmlContent = generateOtpEmail(otpCode, emailOptions);
    const subject = `Your OTP Code - ${emailConfig.businessName}`;

    // Send email using the email service
    const result = await emailService.sendBrevoEmail(
      subject,
      email,
      htmlContent,
      {
        senderName: emailConfig.senderName || emailConfig.businessName
      }
    );

    if (result.success) {
      console.log(`OTP email sent successfully to ${email}`);
      return {
        success: true,
        message: 'OTP email sent successfully',
        messageId: result.messageId
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to send OTP email'
      };
    }
  } catch (error) {
    console.error('OTP email handler error:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while sending OTP email'
    };
  }
};

module.exports = {
  sendOtpEmail
};
