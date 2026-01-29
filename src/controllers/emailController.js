const emailService = require('../services/emailService');
const { ApiResponse } = require('../utils/response');
const { ValidationError } = require('../utils/errors');

class EmailController {
  /**
   * Send welcome email to user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async sendWelcome(req, res, next) {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        throw new ValidationError('Email is required');
      }

      const user = { email, name };
      const result = await emailService.sendWelcomeEmail(user);
      
      res.json(ApiResponse.success(result, 'Welcome email sent successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send password reset email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async sendPasswordReset(req, res, next) {
    try {
      const { email, name, resetToken } = req.body;
      
      if (!email || !resetToken) {
        throw new ValidationError('Email and reset token are required');
      }

      const user = { email, name };
      const result = await emailService.sendPasswordResetEmail(user, resetToken);
      
      res.json(ApiResponse.success(result, 'Password reset email sent successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send custom notification email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async sendNotification(req, res, next) {
    try {
      const { to, subject, message, title, type } = req.body;
      
      if (!to || !subject || !message) {
        throw new ValidationError('Recipient, subject, and message are required');
      }

      const result = await emailService.sendNotification({
        to,
        subject,
        message,
        title,
        type
      });
      
      res.json(ApiResponse.success(result, 'Notification email sent successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send system alert to administrators
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async sendSystemAlert(req, res, next) {
    try {
      const { subject, message, severity } = req.body;
      
      if (!subject || !message) {
        throw new ValidationError('Subject and message are required');
      }

      const result = await emailService.sendSystemAlert({
        subject,
        message,
        severity: severity || 'warning'
      });
      
      res.json(ApiResponse.success(result, 'System alert sent successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test email configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async testConfiguration(req, res, next) {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw new ValidationError('Test email address is required');
      }

      const result = await emailService.testConfiguration(email);
      
      res.json(ApiResponse.success(result, 'Email configuration test completed'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create default email templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createTemplates(req, res, next) {
    try {
      await emailService.createDefaultTemplates();
      
      res.json(ApiResponse.success({}, 'Default email templates created successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmailController();
