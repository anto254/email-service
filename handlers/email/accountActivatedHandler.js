const emailService = require('../../services/emailService');
const emailConfig = require('../../config/emailConfig');
const { generateAccountActivatedEmail } = require('../../templates/email/accountActivatedTemplate');

const sendAccountActivatedEmail = async (email, options = {}) => {
  try {
    if (!email) {
      return { success: false, error: 'Email is required' };
    }

    const htmlContent = generateAccountActivatedEmail(options);
    const subject = `Your Account is Activated - إميراترست | EmiraTrust Bank`;

    const result = await emailService.sendBrevoEmail(
      subject,
      email,
      htmlContent,
      { senderName: "EmiraTrust Bank" }
    );

    console.log("result",result)

    if (result.success) {
      return { success: true, message: 'Account activated email sent', messageId: result.messageId };
    } else {
      return { success: false, error: result.error || 'Failed to send email' };
    }
  } catch (error) {
    console.error('Account activated email handler error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendAccountActivatedEmail };
