const { JobQueue, JOB_TYPES } = require('../utils/jobQueue');
const emailService = require('../services/emailService');
const imageProcessingService = require('../services/imageProcessingService');
const { logger } = require('../utils/logger');

class JobService {
  constructor() {
    this.queue = new JobQueue({
      concurrency: process.env.JOB_CONCURRENCY || 5,
      maxRetries: process.env.JOB_MAX_RETRIES || 3,
      retryDelay: process.env.JOB_RETRY_DELAY || 1000
    });

    this.setupEventListeners();
    this.setupCleanupInterval();
  }

  /**
   * Setup event listeners for the job queue
   */
  setupEventListeners() {
    this.queue.on('jobAdded', (job) => {
      logger.info(`Job added: ${job.id} (${job.type})`);
    });

    this.queue.on('jobStarted', (job) => {
      logger.info(`Job started: ${job.id} (${job.type})`);
    });

    this.queue.on('jobCompleted', (job) => {
      logger.info(`Job completed: ${job.id} (${job.type})`);
    });

    this.queue.on('jobFailed', (job) => {
      logger.error(`Job failed: ${job.id} (${job.type}) - ${job.error?.message}`);
    });

    this.queue.on('jobRetry', (job) => {
      logger.info(`Job retry: ${job.id} (${job.type}) - attempt ${job.retries}`);
    });

    this.queue.on('jobCancelled', (job) => {
      logger.info(`Job cancelled: ${job.id} (${job.type})`);
    });
  }

  /**
   * Setup periodic cleanup of old jobs
   */
  setupCleanupInterval() {
    // Clean up completed jobs every hour
    setInterval(() => {
      const cleared = this.queue.clearCompleted(60); // Clear jobs older than 1 hour
      if (cleared > 0) {
        logger.info(`Cleaned up ${cleared} old jobs`);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Queue an email sending job
   * @param {Object} emailOptions - Email options
   * @param {Object} options - Job options
   * @returns {string} - Job ID
   */
  queueEmailJob(emailOptions, options = {}) {
    return this.queue.addJob({
      type: JOB_TYPES.SEND_EMAIL,
      data: emailOptions,
      handler: async (data) => {
        return await emailService.sendEmail(data);
      }
    }, options);
  }

  /**
   * Queue an image processing job
   * @param {Object} imageData - Image data
   * @param {Object} processingOptions - Processing options
   * @param {Object} options - Job options
   * @returns {string} - Job ID
   */
  queueImageProcessingJob(imageData, processingOptions, options = {}) {
    return this.queue.addJob({
      type: JOB_TYPES.PROCESS_IMAGE,
      data: { imageData, processingOptions },
      handler: async (data) => {
        return await imageProcessingService.processImage(
          data.imageData, 
          data.processingOptions
        );
      }
    }, options);
  }

  /**
   * Queue an SVG conversion job
   * @param {Object} imageData - Image data
   * @param {Object} conversionOptions - Conversion options
   * @param {Object} options - Job options
   * @returns {string} - Job ID
   */
  queueSVGConversionJob(imageData, conversionOptions, options = {}) {
    return this.queue.addJob({
      type: JOB_TYPES.CONVERT_TO_SVG,
      data: { imageData, conversionOptions },
      handler: async (data) => {
        return await imageProcessingService.convertToSVG(
          data.imageData.buffer,
          data.conversionOptions
        );
      }
    }, options);
  }

  /**
   * Queue a file cleanup job
   * @param {Array} filePaths - Array of file paths to clean up
   * @param {Object} options - Job options
   * @returns {string} - Job ID
   */
  queueCleanupJob(filePaths, options = {}) {
    return this.queue.addJob({
      type: JOB_TYPES.CLEANUP_FILES,
      data: { filePaths },
      handler: async (data) => {
        const fs = require('fs').promises;
        const results = [];

        for (const filePath of data.filePaths) {
          try {
            await fs.unlink(filePath);
            results.push({ path: filePath, success: true });
          } catch (error) {
            results.push({ path: filePath, success: false, error: error.message });
          }
        }

        return results;
      }
    }, options);
  }

  /**
   * Queue a report generation job
   * @param {Object} reportOptions - Report generation options
   * @param {Object} options - Job options
   * @returns {string} - Job ID
   */
  queueReportGenerationJob(reportOptions, options = {}) {
    return this.queue.addJob({
      type: JOB_TYPES.GENERATE_REPORT,
      data: reportOptions,
      handler: async (data) => {
        // This is a placeholder implementation
        // In a real application, you would generate actual reports
        const { type, startDate, endDate } = data;
        
        return {
          type,
          period: { startDate, endDate },
          generatedAt: new Date(),
          data: {
            // Placeholder report data
            totalUsers: 100,
            totalOrders: 500,
            revenue: 10000
          }
        };
      }
    }, options);
  }

  /**
   * Queue a database backup job
   * @param {Object} backupOptions - Backup options
   * @param {Object} options - Job options
   * @returns {string} - Job ID
   */
  queueDatabaseBackupJob(backupOptions, options = {}) {
    return this.queue.addJob({
      type: JOB_TYPES.BACKUP_DATABASE,
      data: backupOptions,
      handler: async (data) => {
        // This is a placeholder implementation
        // In a real application, you would perform actual database backups
        const { includeData = true, compression = true } = data;
        
        return {
          backupId: require('uuid').v4(),
          timestamp: new Date(),
          size: Math.floor(Math.random() * 1000000), // Mock size
          compression,
          includeData,
          location: `/backups/backup_${Date.now()}.sql`
        };
      }
    }, options);
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} - Job information
   */
  getJobStatus(jobId) {
    return this.queue.getJob(jobId);
  }

  /**
   * Get queue statistics
   * @returns {Object} - Queue statistics
   */
  getQueueStats() {
    return this.queue.getStats();
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID
   * @returns {boolean} - Success status
   */
  cancelJob(jobId) {
    return this.queue.cancelJob(jobId);
  }

  /**
   * Get all jobs with filtering
   * @param {Object} filters - Filter options
   * @returns {Array} - Array of jobs
   */
  getJobs(filters = {}) {
    return this.queue.getJobs(filters);
  }

  /**
   * Start the job queue
   */
  start() {
    this.queue.startProcessing();
    logger.info('Job service started');
  }

  /**
   * Stop the job queue
   */
  stop() {
    this.queue.stopProcessing();
    logger.info('Job service stopped');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down job service...');
    
    // Stop accepting new jobs
    this.stop();
    
    // Wait for running jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.queue.running.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (this.queue.running.size > 0) {
      logger.warn(`Shutdown timeout: ${this.queue.running.size} jobs still running`);
    } else {
      logger.info('All jobs completed successfully');
    }
  }
}

module.exports = new JobService();
