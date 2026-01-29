const jobService = require('../services/jobService');
const { ApiResponse } = require('../utils/response');
const { ValidationError } = require('../utils/errors');

class JobController {
  /**
   * Get job status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      
      if (!jobId) {
        throw new ValidationError('Job ID is required');
      }

      const job = jobService.getJobStatus(jobId);
      
      if (!job) {
        throw new ValidationError('Job not found');
      }

      res.json(ApiResponse.success(job, 'Job status retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get queue statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getQueueStats(req, res, next) {
    try {
      const stats = jobService.getQueueStats();
      
      res.json(ApiResponse.success(stats, 'Queue statistics retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all jobs with filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getJobs(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        type: req.query.type,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const jobs = jobService.getJobs(filters);
      
      res.json(ApiResponse.success(jobs, 'Jobs retrieved'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async cancelJob(req, res, next) {
    try {
      const { jobId } = req.params;
      
      if (!jobId) {
        throw new ValidationError('Job ID is required');
      }

      const success = jobService.cancelJob(jobId);
      
      if (!success) {
        throw new ValidationError('Job cannot be cancelled (not found or already running)');
      }

      res.json(ApiResponse.success({ cancelled: true }, 'Job cancelled successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Queue an email job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async queueEmailJob(req, res, next) {
    try {
      const { to, subject, template, data, priority } = req.body;
      
      if (!to || !subject) {
        throw new ValidationError('Recipient and subject are required');
      }

      const jobId = jobService.queueEmailJob(
        { to, subject, template, data },
        { priority: parseInt(priority) || 0 }
      );

      res.json(ApiResponse.success({ jobId }, 'Email job queued successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Queue an image processing job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async queueImageProcessingJob(req, res, next) {
    try {
      const { imageData, processingOptions, priority } = req.body;
      
      if (!imageData) {
        throw new ValidationError('Image data is required');
      }

      const jobId = jobService.queueImageProcessingJob(
        imageData,
        processingOptions || {},
        { priority: parseInt(priority) || 0 }
      );

      res.json(ApiResponse.success({ jobId }, 'Image processing job queued successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Queue an SVG conversion job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async queueSVGConversionJob(req, res, next) {
    try {
      const { imageData, conversionOptions, priority } = req.body;
      
      if (!imageData) {
        throw new ValidationError('Image data is required');
      }

      const jobId = jobService.queueSVGConversionJob(
        imageData,
        conversionOptions || {},
        { priority: parseInt(priority) || 0 }
      );

      res.json(ApiResponse.success({ jobId }, 'SVG conversion job queued successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Queue a cleanup job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async queueCleanupJob(req, res, next) {
    try {
      const { filePaths, priority } = req.body;
      
      if (!filePaths || !Array.isArray(filePaths)) {
        throw new ValidationError('File paths array is required');
      }

      const jobId = jobService.queueCleanupJob(
        filePaths,
        { priority: parseInt(priority) || 0 }
      );

      res.json(ApiResponse.success({ jobId }, 'Cleanup job queued successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Queue a report generation job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async queueReportJob(req, res, next) {
    try {
      const { type, startDate, endDate, priority } = req.body;
      
      if (!type || !startDate || !endDate) {
        throw new ValidationError('Report type, start date, and end date are required');
      }

      const jobId = jobService.queueReportGenerationJob(
        { type, startDate, endDate },
        { priority: parseInt(priority) || 0 }
      );

      res.json(ApiResponse.success({ jobId }, 'Report generation job queued successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Queue a database backup job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async queueBackupJob(req, res, next) {
    try {
      const { includeData, compression, priority } = req.body;
      
      const jobId = jobService.queueDatabaseBackupJob(
        { includeData, compression },
        { priority: parseInt(priority) || 0 }
      );

      res.json(ApiResponse.success({ jobId }, 'Database backup job queued successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new JobController();
