/**
 * Test Configuration Loading
 * Verifies that email configuration loads correctly
 */

console.log('=== Email Service Configuration Test ===\n');

try {
  const emailConfig = require('./config/emailConfig');

  console.log('✅ Configuration loaded successfully!\n');

  console.log('Business Information:');
  console.log('  Name:', emailConfig.businessName);
  console.log('  Website:', emailConfig.websiteUrl || '(not set)');
  console.log('  Phone:', emailConfig.contactPhone || '(not set)');
  console.log('  Email:', emailConfig.contactEmail);

  console.log('\nEmail Settings:');
  console.log('  Sender Email:', emailConfig.senderEmail);
  console.log('  Sender Name:', emailConfig.senderName);
  console.log('  OTP Expiry:', emailConfig.defaultOtpExpiryMinutes, 'minutes');

  console.log('\nBrand Colors:');
  console.log('  Primary:', emailConfig.brandColors.primary);
  console.log('  Secondary:', emailConfig.brandColors.secondary);
  console.log('  Warning:', emailConfig.brandColors.warning);

  console.log('\nFrontend URL:', emailConfig.frontendUrl);

  console.log('\n=== Configuration Test Complete ===');
  console.log('\n💡 To customize, edit your .env file and restart the server.');

} catch (error) {
  console.error('❌ Configuration loading failed:', error.message);
  process.exit(1);
}
