const emailService = require('../../services/emailService');
const emailConfig = require('../../config/emailConfig');
const { generateAccountRejectedEmail } = require('../../templates/email/accountRejectedTemplate');

const sendAccountRejectedEmail = async (email, options = {}) => {
  try {
    if (!email) {
      return { success: false, error: 'Email is required' };
    }

    const htmlContent = generateAccountRejectedEmail(options);
    const subject = `Update on Your Account Application - إميراترست | EmiraTrust Bank`;

    const result = await emailService.sendBrevoEmail(
      subject,
      email,
      htmlContent,
      { senderName: "EmiraTrust Bank" }
    );

    if (result.success) {
      return { success: true, message: 'Account rejected email sent', messageId: result.messageId };
    } else {
      return { success: false, error: result.error || 'Failed to send email' };
    }
  } catch (error) {
    console.error('Account rejected email handler error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendAccountRejectedEmail };
