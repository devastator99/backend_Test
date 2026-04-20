const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 5;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.jobs = new Map();
    this.running = new Set();
    this.completed = new Set();
    this.failed = new Set();
    this.isProcessing = false;
    this.processInterval = null;
  }

  /**
   * Add a job to the queue
   * @param {Object} job - Job object
   * @param {string} job.type - Job type
   * @param {Object} job.data - Job data
   * @param {Function} job.handler - Job handler function
   * @param {Object} options - Job options
   * @returns {string} - Job ID
   */
  addJob(job, options = {}) {
    const jobId = options.id || uuidv4();
    const jobData = {
      id: jobId,
      type: job.type,
      data: job.data,
      handler: job.handler,
      priority: options.priority || 0,
      retries: 0,
      maxRetries: options.maxRetries || this.maxRetries,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      error: null,
      status: 'pending'
    };

    this.jobs.set(jobId, jobData);
    this.emit('jobAdded', jobData);
    
    this.startProcessing();
    
    return jobId;
  }

  /**
   * Start processing jobs in the queue
   */
  startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processInterval = setInterval(() => {
      this.processNextJob();
    }, 100);
    
    logger.info('Job queue processing started');
  }

  /**
   * Stop processing jobs
   */
  stopProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.isProcessing = false;
    logger.info('Job queue processing stopped');
  }

  /**
   * Process the next available job
   */
  async processNextJob() {
    if (this.running.size >= this.concurrency) {
      return;
    }

    const nextJob = this.getNextJob();
    if (!nextJob) {
      return;
    }

    this.running.add(nextJob.id);
    nextJob.status = 'running';
    nextJob.startedAt = new Date();
    
    this.emit('jobStarted', nextJob);

    try {
      logger.info(`Processing job ${nextJob.id} (${nextJob.type})`);
      
      const result = await nextJob.handler(nextJob.data);
      
      nextJob.status = 'completed';
      nextJob.completedAt = new Date();
      nextJob.result = result;
      
      this.running.delete(nextJob.id);
      this.completed.add(nextJob.id);
      
      this.emit('jobCompleted', nextJob);
      logger.info(`Job ${nextJob.id} completed successfully`);
      
    } catch (error) {
      logger.error(`Job ${nextJob.id} failed:`, error);
      
      nextJob.error = error;
      nextJob.retries++;
      
      if (nextJob.retries < nextJob.maxRetries) {
        // Retry the job
        nextJob.status = 'pending';
        this.running.delete(nextJob.id);
        
        // Add delay before retry
        setTimeout(() => {
          this.emit('jobRetry', nextJob);
          logger.info(`Retrying job ${nextJob.id} (${nextJob.retries}/${nextJob.maxRetries})`);
        }, this.retryDelay * Math.pow(2, nextJob.retries - 1));
        
      } else {
        // Mark as failed
        nextJob.status = 'failed';
        nextJob.failedAt = new Date();
        
        this.running.delete(nextJob.id);
        this.failed.add(nextJob.id);
        
        this.emit('jobFailed', nextJob);
        logger.error(`Job ${nextJob.id} failed permanently after ${nextJob.retries} retries`);
      }
    }
  }

  /**
   * Get the next job to process based on priority
   * @returns {Object|null} - Next job or null
   */
  getNextJob() {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => b.priority - a.priority);
    
    return pendingJobs[0] || null;
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} - Job information
   */
  getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
      retries: job.retries,
      maxRetries: job.maxRetries,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      error: job.error ? job.error.message : null,
      result: job.result || null
    };
  }

  /**
   * Get queue statistics
   * @returns {Object} - Queue statistics
   */
  getStats() {
    const total = this.jobs.size;
    const pending = Array.from(this.jobs.values()).filter(job => job.status === 'pending').length;
    const running = this.running.size;
    const completed = this.completed.size;
    const failed = this.failed.size;

    return {
      total,
      pending,
      running,
      completed,
      failed,
      isProcessing: this.isProcessing,
      concurrency: this.concurrency
    };
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID
   * @returns {boolean} - Success status
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'pending') {
      job.status = 'cancelled';
      job.cancelledAt = new Date();
      this.jobs.delete(jobId);
      this.emit('jobCancelled', job);
      return true;
    }

    return false;
  }

  /**
   * Clear completed jobs
   * @param {number} olderThan - Clear jobs older than this many minutes
   */
  clearCompleted(olderThan = 60) {
    const cutoff = new Date(Date.now() - olderThan * 60 * 1000);
    let cleared = 0;

    for (const jobId of this.completed) {
      const job = this.jobs.get(jobId);
      if (job && job.completedAt && job.completedAt < cutoff) {
        this.jobs.delete(jobId);
        this.completed.delete(jobId);
        cleared++;
      }
    }

    logger.info(`Cleared ${cleared} completed jobs older than ${olderThan} minutes`);
    return cleared;
  }

  /**
   * Get all jobs with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Array} - Array of jobs
   */
  getJobs(filters = {}) {
    const { status, type, limit = 50, offset = 0 } = filters;
    
    let jobs = Array.from(this.jobs.values());
    
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }
    
    if (type) {
      jobs = jobs.filter(job => job.type === type);
    }
    
    // Sort by creation date (newest first)
    jobs.sort((a, b) => b.createdAt - a.createdAt);
    
    // Apply pagination
    jobs = jobs.slice(offset, offset + limit);
    
    return jobs.map(job => this.getJob(job.id));
  }
}

// Predefined job types
const JOB_TYPES = {
  SEND_EMAIL: 'send_email',
  PROCESS_IMAGE: 'process_image',
  CONVERT_TO_SVG: 'convert_to_svg',
  CLEANUP_FILES: 'cleanup_files',
  GENERATE_REPORT: 'generate_report',
  BACKUP_DATABASE: 'backup_database'
};

module.exports = {
  JobQueue,
  JOB_TYPES
};
