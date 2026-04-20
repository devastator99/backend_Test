const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.templatesDir = path.join(process.cwd(), 'templates', 'emails');
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter with configuration
   */
  initializeTransporter() {
    try {
      const config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      if (config.host && config.auth.user && config.auth.pass) {
        this.transporter = nodemailer.createTransporter(config);
        this.isConfigured = true;
        console.log('✅ Email service configured');
      } else {
        console.warn('⚠️ Email service not configured - missing environment variables');
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
    }
  }

  /**
   * Send email using template
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template name
   * @param {Object} options.data - Template data
   * @param {Array} options.attachments - File attachments
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail({ to, subject, template, data = {}, attachments = [] }) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      const html = await this.renderTemplate(template, data);
      
      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'Backend System'}" <${process.env.FROM_EMAIL}>`,
        to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Email sent to ${to}: ${subject}`);
      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Render email template with data
   * @param {string} templateName - Template file name
   * @param {Object} data - Template variables
   * @returns {Promise<string>} - Rendered HTML
   */
  async renderTemplate(templateName, data) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      let template = await fs.readFile(templatePath, 'utf8');

      // Simple template replacement (you could use a more sophisticated templating engine)
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        template = template.replace(regex, value);
      }

      return template;
    } catch (error) {
      // Fallback to simple HTML if template not found
      return this.generateFallbackHTML(data);
    }
  }

  /**
   * Generate fallback HTML email
   * @param {Object} data - Email data
   * @returns {string} - HTML content
   */
  generateFallbackHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.subject || 'Notification'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.title || 'Notification'}</h1>
          </div>
          <div class="content">
            ${data.message || 'This is an automated notification.'}
          </div>
          <div class="footer">
            <p>Sent from Backend System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send welcome email
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Send result
   */
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Our Platform',
      template: 'welcome',
      data: {
        name: user.name || user.email,
        title: 'Welcome!',
        message: `Thank you for joining our platform. Your account has been created successfully.`
      }
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>} - Send result
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        name: user.name || user.email,
        resetUrl,
        title: 'Reset Your Password',
        message: `You requested a password reset. Click the link below to reset your password.`
      }
    });
  }

  /**
   * Send notification email
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} - Send result
   */
  async sendNotification({ to, subject, message, title, type = 'info' }) {
    return this.sendEmail({
      to,
      subject,
      template: 'notification',
      data: {
        title: title || subject,
        message,
        type
      }
    });
  }

  /**
   * Send system alert email to administrators
   * @param {Object} options - Alert options
   * @returns {Promise<Object>} - Send result
   */
  async sendSystemAlert({ subject, message, severity = 'warning' }) {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails configured for system alerts');
      return { success: false, message: 'No admin emails configured' };
    }

    const promises = adminEmails.map(email =>
      this.sendEmail({
        to: email.trim(),
        subject: `[${severity.toUpperCase()}] ${subject}`,
        template: 'alert',
        data: {
          title: `System Alert - ${severity.toUpperCase()}`,
          message,
          severity,
          timestamp: new Date().toISOString()
        }
      })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: failed === 0,
      summary: { total: adminEmails.length, successful, failed }
    };
  }

  /**
   * Test email configuration
   * @param {string} testEmail - Test recipient email
   * @returns {Promise<Object>} - Test result
   */
  async testConfiguration(testEmail) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      const result = await this.sendEmail({
        to: testEmail,
        subject: 'Email Configuration Test',
        template: 'test',
        data: {
          title: 'Configuration Test',
          message: 'This is a test email to verify the email service configuration.',
          timestamp: new Date().toISOString()
        }
      });

      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create email templates directory and default templates
   */
  async createDefaultTemplates() {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });

      const templates = {
        'welcome.html': `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>Welcome</title></head>
          <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #007bff;">Welcome {{name}}!</h1>
              <p>{{message}}</p>
              <p>Best regards,<br>The Team</p>
            </div>
          </body>
          </html>
        `,
        'password-reset.html': `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>Password Reset</title></head>
          <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #dc3545;">Reset Your Password</h1>
              <p>{{message}}</p>
              <p><a href="{{resetUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none;">Reset Password</a></p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          </body>
          </html>
        `
      };

      for (const [filename, content] of Object.entries(templates)) {
        const filePath = path.join(this.templatesDir, filename);
        await fs.writeFile(filePath, content);
      }

      console.log('✅ Default email templates created');
    } catch (error) {
      console.error('❌ Failed to create email templates:', error.message);
    }
  }
}

module.exports = new EmailService();
