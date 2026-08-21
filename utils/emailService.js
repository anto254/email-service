const emailService = require('../services/emailService');

const sendPasswordEmail = async (email, password, firstName) => {
  try {
    const subject = 'Your DasOps Account Credentials';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to DasOps</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f9fafb;
              }
              .container {
                  background: white;
                  padding: 30px;
                  border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              }
              .header {
                  background-color: #f59e0b;
                  background: linear-gradient(135deg, #f59e0b, #d97706);
                  color: #ffffff;
                  padding: 25px;
                  text-align: center;
                  border-radius: 12px;
                  margin-bottom: 30px;
              }
              .logo {
                  font-size: 26px;
                  font-weight: bold;
                  margin-bottom: 8px;
                  color: #ffffff;
              }
              .subtitle {
                  opacity: 0.9;
                  font-size: 16px;
                  color: #ffffff;
              }
              .credentials-box {
                  background: #f8fafc;
                  padding: 20px;
                  border-radius: 10px;
                  margin: 25px 0;
                  border-left: 4px solid #f59e0b;
              }
              .credential-item {
                  margin: 10px 0;
                  padding: 8px 0;
                  border-bottom: 1px solid #e5e7eb;
              }
              .credential-item:last-child {
                  border-bottom: none;
              }
              .password-code {
                  background-color: #e5e7eb;
                  padding: 8px 12px;
                  border-radius: 5px;
                  font-family: 'Courier New', monospace;
                  font-weight: bold;
                  color: #1f2937;
                  display: inline-block;
                  margin-top: 5px;
              }
              .security-warning {
                  background: #fef3c7;
                  padding: 15px;
                  border-radius: 8px;
                  margin: 20px 0;
                  border-left: 4px solid #f59e0b;
              }
              .security-warning strong {
                  color: #d97706;
              }
              .login-button {
                  display: inline-block;
                  background-color: #f59e0b;
                  background: linear-gradient(135deg, #f59e0b, #d97706);
                  color: #ffffff;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                  margin: 20px 0;
              }
              .contact-info {
                  background: #eff6ff;
                  padding: 20px;
                  border-radius: 8px;
                  margin-top: 25px;
                  border-left: 4px solid #3b82f6;
              }
              .footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 2px solid #f3f4f6;
                  color: #6b7280;
                  font-size: 14px;
                  text-align: center;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header" style="background-color: #f59e0b; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 25px; text-align: center; border-radius: 12px; margin-bottom: 30px;">
                  <div class="logo" style="font-size: 26px; font-weight: bold; margin-bottom: 8px; color: #ffffff;">🔐 Welcome to DasOps!</div>
                  <div class="subtitle" style="opacity: 0.9; font-size: 16px; color: #ffffff;">Daylight Adventures & Safaris Operations</div>
              </div>

              <p>Hello <strong>${firstName}</strong>,</p>
              <p>Your DasOps account has been created successfully! You now have access to our comprehensive safari operations management system.</p>

              <div class="credentials-box">
                  <h3 style="color: #f59e0b; margin-bottom: 15px;">🎫 Your Login Credentials</h3>
                  <div class="credential-item">
                      <strong>Email:</strong> ${email}
                  </div>
                  <div class="credential-item">
                      <strong>Temporary Password:</strong><br>
                      <span class="password-code">${password}</span>
                  </div>
              </div>

              <div class="security-warning">
                  <strong>🚨 Important Security Notice:</strong><br>
                  For your account security, please log in immediately and change your password to something only you know.
                  Never share your login credentials with anyone.
              </div>

              <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="login-button">
                      🚀 Login to DasOps
                  </a>
              </div>

              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="color: #334155; margin-bottom: 10px;">📋 What you can do with DasOps:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                      <li>Manage safari bookings and itineraries</li>
                      <li>Track leads and client communications</li>
                      <li>Generate proposals, invoices, and vouchers</li>
                      <li>Coordinate with team members and partners</li>
                      <li>Access comprehensive reporting and analytics</li>
                  </ul>
              </div>

              <div class="contact-info">
                  <strong>📞 Need Help Getting Started?</strong><br>
                  Our support team is here to help:<br>
                  <strong>Phone:</strong> +254 740 120 530 | +254 715 837 777<br>
                  <strong>Email:</strong> info@daylightadventures.com<br>
                  <strong>Office:</strong> Crescent Business Centre, Parklands, Nairobi
              </div>

              <div class="footer">
                  <p>Welcome to the team! We're excited to have you aboard.</p>
                  <p style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
                      © ${new Date().getFullYear()} Daylight Adventures & Safaris. All rights reserved.
                  </p>
              </div>
          </div>
      </body>
      </html>
    `;

    const result = await emailService.sendBrevoEmail(
      subject,
      email,
      htmlContent,
      {
        senderName: 'DasOps - Account Setup'
      }
    );

    return result;
  } catch (error) {
    console.error('Password email sending error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPasswordEmail };