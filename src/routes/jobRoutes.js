const express = require('express');
const { body, query } = require('express-validator');
const jobController = require('../controllers/jobController');
const authMiddleware = require('../middleware/auth');
const { authRateLimitMiddleware } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all job routes
router.use(authMiddleware);

// Validation middleware
const queueJobValidation = [
  body('priority').optional().isInt({ min: 0, max: 10 }).withMessage('Priority must be between 0 and 10')
];

const emailJobValidation = [
  body('to').isEmail().withMessage('Valid recipient email is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('template').optional().isString().withMessage('Template must be a string'),
  body('data').optional().isObject().withMessage('Data must be an object')
];

const imageJobValidation = [
  body('imageData').notEmpty().withMessage('Image data is required'),
  body('processingOptions').optional().isObject().withMessage('Processing options must be an object')
];

const reportJobValidation = [
  body('type').isIn(['users', 'orders', 'revenue', 'activity']).withMessage('Invalid report type'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
];

const filtersValidation = [
  query('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'cancelled']).withMessage('Invalid status'),
  query('type').optional().isString().withMessage('Type must be a string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
];

// Routes
/**
 * @swagger
 * /api/jobs/status/{jobId}:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: Get job status
 *     description: Get the status and details of a specific job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.get('/status/:jobId',
  authRateLimitMiddleware,
  jobController.getJobStatus
);

/**
 * @swagger
 * /api/jobs/stats:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: Get queue statistics
 *     description: Get statistics about the job queue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats',
  authRateLimitMiddleware,
  jobController.getQueueStats
);

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: Get all jobs
 *     description: Get a list of all jobs with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed, cancelled]
 *         description: Filter by job status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by job type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of jobs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of jobs to skip
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/',
  authRateLimitMiddleware,
  filtersValidation,
  jobController.getJobs
);

/**
 * @swagger
 * /api/jobs/{jobId}/cancel:
 *   delete:
 *     tags:
 *       - Jobs
 *     summary: Cancel a job
 *     description: Cancel a pending job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 *       400:
 *         description: Job cannot be cancelled
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:jobId/cancel',
  authRateLimitMiddleware,
  jobController.cancelJob
);

/**
 * @swagger
 * /api/jobs/queue/email:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Queue email job
 *     description: Queue an email to be sent asynchronously
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
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               template:
 *                 type: string
 *               data:
 *                 type: object
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Email job queued successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/queue/email',
  authRateLimitMiddleware,
  queueJobValidation,
  emailJobValidation,
  jobController.queueEmailJob
);

/**
 * @swagger
 * /api/jobs/queue/image-process:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Queue image processing job
 *     description: Queue an image to be processed asynchronously
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageData
 *             properties:
 *               imageData:
 *                 type: object
 *               processingOptions:
 *                 type: object
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Image processing job queued successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/queue/image-process',
  authRateLimitMiddleware,
  queueJobValidation,
  imageJobValidation,
  jobController.queueImageProcessingJob
);

/**
 * @swagger
 * /api/jobs/queue/svg-convert:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Queue SVG conversion job
 *     description: Queue an image to be converted to SVG asynchronously
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageData
 *             properties:
 *               imageData:
 *                 type: object
 *               conversionOptions:
 *                 type: object
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: SVG conversion job queued successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/queue/svg-convert',
  authRateLimitMiddleware,
  queueJobValidation,
  imageJobValidation,
  jobController.queueSVGConversionJob
);

/**
 * @swagger
 * /api/jobs/queue/cleanup:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Queue cleanup job
 *     description: Queue a cleanup job to remove files
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filePaths
 *             properties:
 *               filePaths:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Cleanup job queued successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/queue/cleanup',
  authRateLimitMiddleware,
  queueJobValidation,
  [
    body('filePaths').isArray().withMessage('File paths must be an array')
  ],
  jobController.queueCleanupJob
);

/**
 * @swagger
 * /api/jobs/queue/report:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Queue report generation job
 *     description: Queue a report to be generated asynchronously
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - startDate
 *               - endDate
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [users, orders, revenue, activity]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Report generation job queued successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/queue/report',
  authRateLimitMiddleware,
  queueJobValidation,
  reportJobValidation,
  jobController.queueReportJob
);

/**
 * @swagger
 * /api/jobs/queue/backup:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Queue database backup job
 *     description: Queue a database backup to be created asynchronously
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeData:
 *                 type: boolean
 *               compression:
 *                 type: boolean
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Database backup job queued successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/queue/backup',
  authRateLimitMiddleware,
  queueJobValidation,
  jobController.queueBackupJob
);

module.exports = router;
