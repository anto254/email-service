/**
 * OTP Email Template
 * Generates HTML content for OTP verification emails
 * Uses configurable variables for business information
 */

const emailConfig = require('../../config/emailConfig');

/**
 * Generate OTP email HTML
 * @param {string} otpCode - The OTP code
 * @param {Object} options - Email options
 * @param {string} options.recipientName - Recipient's name (optional)
 * @param {number} options.expiryMinutes - OTP expiry time in minutes
 * @param {string} options.purpose - Purpose of OTP (e.g., 'verify your account')
 * @returns {string} HTML email content
 */
const generateOtpEmail = (otpCode, options = {}) => {
  const recipientName = options.recipientName || 'User';
  const expiryMinutes = options.expiryMinutes || emailConfig.defaultOtpExpiryMinutes;
  const purpose = options.purpose || 'verify your account';
  const { businessName, websiteUrl, contactPhone, contactEmail, brandColors } = emailConfig;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%);
          color: #ffffff;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 40px 30px;
        }
        .otp-box {
          background-color: #f8f9fa;
          border: 2px dashed ${brandColors.primary};
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: ${brandColors.primary};
          letter-spacing: 8px;
          margin: 10px 0;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid ${brandColors.warning};
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
        }
        .footer a {
          color: ${brandColors.primary};
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${businessName}</h1>
        </div>
        <div class="content">
          <h2>Your Verification Code</h2>
          <p>Hello${recipientName !== 'User' ? ` ${recipientName}` : ''},</p>
          <p>You have requested a One-Time Password (OTP) to ${purpose}. Please use the code below:</p>

          <div class="otp-box">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">Your OTP Code</p>
            <div class="otp-code">${otpCode}</div>
            <p style="margin: 0; color: #6c757d; font-size: 14px;">Valid for ${expiryMinutes} minutes</p>
          </div>

          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Never share this code with anyone</li>
              <li>This code expires in ${expiryMinutes} minutes</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
          </div>

          <p>If you have any questions or concerns, please contact our support team.</p>
          <p>Best regards,<br><strong>${businessName} Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
          ${websiteUrl ? `<p><a href="${websiteUrl}">Visit our website</a></p>` : ''}
          ${contactPhone ? `<p>Contact: ${contactPhone}</p>` : ''}
          ${contactEmail ? `<p>Email: ${contactEmail}</p>` : ''}
          <p style="margin-top: 15px; color: #999;">This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  generateOtpEmail
};
