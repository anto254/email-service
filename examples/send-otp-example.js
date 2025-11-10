/**
 * Example: Sending OTP Email
 * This example demonstrates how to send an OTP email using the email service API
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3501';

/**
 * Send OTP Email with all options
 * @param {Object} options - Email options
 */
async function sendOtpEmail(options) {
  try {
    console.log('Sending OTP email...');
    console.log('Recipient:', options.email);
    console.log('OTP Code:', options.otpCode);

    const response = await axios.post(`${API_BASE_URL}/api/email/send`, {
      type: 'otp',
      ...options
    });

    if (response.data.success) {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', response.data.data.messageId);
      return response.data;
    } else {
      console.error('❌ Failed to send email:', response.data.message);
      return response.data;
    }
  } catch (error) {
    if (error.response) {
      // Server responded with error
      console.error('❌ Server Error:', error.response.data);
      console.error('Status:', error.response.status);
    } else if (error.request) {
      // Request made but no response
      console.error('❌ No response from server. Is the server running?');
    } else {
      // Other errors
      console.error('❌ Error:', error.message);
    }
    throw error;
  }
}

/**
 * Get supported email types
 */
async function getSupportedTypes() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/email/types`);
    console.log('Supported Email Types:');
    console.log(JSON.stringify(response.data.data.supportedTypes, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get email types:', error.message);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    console.log('=== Email Service Example ===\n');

    // Example 1: Get supported types
    console.log('1. Getting supported email types...');
    await getSupportedTypes();
    console.log('\n');

    // Example 2: Send OTP email with minimal options
    console.log('2. Sending OTP email (minimal options)...');
    await sendOtpEmail({
      email: 'user@example.com',
      otpCode: '123456'
    });
    console.log('\n');

    // Example 3: Send OTP email with recipient name
    console.log('3. Sending OTP email with recipient name...');
    await sendOtpEmail({
      email: 'john@example.com',
      otpCode: '789012',
      recipientName: 'John Doe'
    });
    console.log('\n');

    // Example 4: Send OTP email with all options
    console.log('4. Sending OTP email with all options...');
    await sendOtpEmail({
      email: 'jane@example.com',
      otpCode: '456789',
      recipientName: 'Jane Smith',
      expiryMinutes: 15,
      purpose: 'complete your registration'
    });
    console.log('\n');

    // Example 5: Send OTP for password reset
    console.log('5. Sending OTP for password reset...');
    await sendOtpEmail({
      email: 'reset@example.com',
      otpCode: '999888',
      recipientName: 'Bob Wilson',
      expiryMinutes: 5,
      purpose: 'reset your password'
    });
    console.log('\n');

    console.log('=== Examples completed ===');
  } catch (error) {
    console.error('Example execution failed:', error.message);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main();
}

// Export functions for use in other modules
module.exports = {
  sendOtpEmail,
  getSupportedTypes
};
