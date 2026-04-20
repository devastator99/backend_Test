const express = require('express');
const { body } = require('express-validator');
const emailController = require('../controllers/emailController');
const { authRateLimitMiddleware } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all email routes
router.use(authMiddleware);

// Validation middleware
const sendEmailValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('name').optional().isString().withMessage('Name must be a string'),
  body('title').optional().isString().withMessage('Title must be a string'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid type')
];

const systemAlertValidation = [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('severity').optional().isIn(['info', 'warning', 'error', 'critical']).withMessage('Invalid severity level')
];

// Routes
/**
 * @swagger
 * /api/emails/welcome:
 *   post:
 *     tags:
 *       - Emails
 *     summary: Send welcome email
 *     description: Send a welcome email to a new user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Welcome email sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.post('/welcome',
  authRateLimitMiddleware,
  sendEmailValidation,
  emailController.sendWelcome
);

/**
 * @swagger
 * /api/emails/password-reset:
 *   post:
 *     tags:
 *       - Emails
 *     summary: Send password reset email
 *     description: Send password reset email with reset token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - resetToken
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               resetToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/password-reset',
  authRateLimitMiddleware,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    body('name').optional().isString().withMessage('Name must be a string')
  ],
  emailController.sendPasswordReset
);

/**
 * @swagger
 * /api/emails/notify:
 *   post:
 *     tags:
 *       - Emails
 *     summary: Send custom notification email
 *     description: Send a custom notification email
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *               - message
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, warning, error, success]
 *     responses:
 *       200:
 *         description: Notification email sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/notify',
  authRateLimitMiddleware,
  sendEmailValidation,
  emailController.sendNotification
);

/**
 * @swagger
 * /api/emails/system-alert:
 *   post:
 *     tags:
 *       - Emails
 *     summary: Send system alert
 *     description: Send system alert to all administrators
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [info, warning, error, critical]
 *                 default: warning
 *     responses:
 *       200:
 *         description: System alert sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/system-alert',
  authRateLimitMiddleware,
  systemAlertValidation,
  emailController.sendSystemAlert
);

/**
 * @swagger
 * /api/emails/test:
 *   post:
 *     tags:
 *       - Emails
 *     summary: Test email configuration
 *     description: Send a test email to verify configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email configuration test completed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/test',
  authRateLimitMiddleware,
  [
    body('email').isEmail().withMessage('Valid test email is required')
  ],
  emailController.testConfiguration
);

/**
 * @swagger
 * /api/emails/templates:
 *   post:
 *     tags:
 *       - Emails
 *     summary: Create default email templates
 *     description: Create default HTML email templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default templates created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/templates',
  authRateLimitMiddleware,
  emailController.createTemplates
);

module.exports = router;
