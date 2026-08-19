const Sib = require('sib-api-v3-sdk');
const asyncHandler = require('express-async-handler');

class EmailService {
  constructor() {
    this.transactionalEmailApi = null;
    this.initializeBrevoAPI();
  }

  initializeBrevoAPI() {
    if (!process.env.BREVO_SMTP_KEY) {
      console.error('BREVO_SMTP_KEY not found in environment variables');
      return;
    }

    try {
      // Initialize Brevo API client
      const client = Sib.ApiClient.instance;
      const apiKey = client.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_SMTP_KEY;

      // Create TransactionalEmailsApi instance
      this.transactionalEmailApi = new Sib.TransactionalEmailsApi();

      console.log('Brevo API email service initialized successfully');
    } catch (error) {
      console.error('Brevo API initialization error:', error);
    }
  }

  // Core email sending function (improved version of our working code)
  async sendBrevoEmail(subject, receivers, htmlContent, options = {}) {
    try {
      if (!this.transactionalEmailApi) {
        throw new Error('Brevo API not initialized. Check BREVO_SMTP_KEY configuration.');
      }

      const sender = {
        email: options.senderEmail || process.env.SMTP_FROM || process.env.SUPPORT_EMAIL || 'noreply@radientdesk.com',
        name: options.senderName || 'Radient Desk'
      };

      // Ensure receivers is in correct format
      const toRecipients = Array.isArray(receivers)
        ? receivers.map(email => typeof email === 'string' ? { email } : email)
        : [typeof receivers === 'string' ? { email: receivers } : receivers];

      const emailData = {
        subject: subject,
        htmlContent: htmlContent,
        sender: sender,
        to: toRecipients,
        ...(options.cc && { cc: Array.isArray(options.cc) ? options.cc.map(email => ({ email })) : [{ email: options.cc }] }),
        ...(options.bcc && { bcc: Array.isArray(options.bcc) ? options.bcc.map(email => ({ email })) : [{ email: options.bcc }] }),
        ...(options.replyTo && { replyTo: { email: options.replyTo } }),
        ...(options.attachments && {
          attachment: options.attachments.map(att => ({
            name: att.name || att.filename,
            content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content
          }))
        })
      };

      const result = await this.transactionalEmailApi.sendTransacEmail(emailData);
      console.log('Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        response: result
      };

    } catch (error) {
      console.error('Brevo email sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }









  async sendBulkEmails(emailList) {
    const results = [];

    for (const emailOptions of emailList) {
      try {
        const result = await this.sendDocument(emailOptions);
        results.push({
          success: true,
          recipient: emailOptions.to,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          success: false,
          recipient: emailOptions.to,
          error: error.message
        });
      }

      // Add delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  async testConnection() {
    try {
      if (!this.transactionalEmailApi) {
        return { success: false, error: 'Brevo API not initialized. Check BREVO_SMTP_KEY configuration.' };
      }

      // Test with a simple email to verify API connectivity
      const testResult = await this.sendBrevoEmail(
        'Radient Desk Brevo API Test',
        process.env.SMTP_FROM || process.env.SMTP_USER || 'test@example.com',
        '<h1>Test Email</h1><p>This is a test to verify Brevo API connectivity.</p>'
      );

      if (testResult.success) {
        return { success: true, message: 'Brevo API service is configured correctly' };
      } else {
        return { success: false, error: testResult.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

 
}

module.exports = new EmailService();