/**
 * Email Configuration
 * Centralized configuration for email service
 */

module.exports = {
  // Business Information
  businessName: process.env.BUSINESS_NAME || 'Your Business',
  websiteUrl: process.env.WEBSITE_URL || '',
  contactPhone: process.env.CONTACT_PHONE || '',
  contactEmail: process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@example.com',

  // Email Settings
  senderEmail: process.env.SMTP_FROM || 'noreply@example.com',
  senderName:  process.env.BUSINESS_NAME || 'Your Business',

  // OTP Settings
  defaultOtpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,

  // Brand Colors (can be customized)
  brandColors: {
    primary: process.env.BRAND_PRIMARY_COLOR || '#667eea',
    secondary: process.env.BRAND_SECONDARY_COLOR || '#764ba2',
    warning: process.env.BRAND_WARNING_COLOR || '#ffc107'
  },

  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};
