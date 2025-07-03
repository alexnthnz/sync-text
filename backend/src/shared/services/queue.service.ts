import { RedisService } from './redis.service';

export interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  priority?: number;
  attempts?: number;
  maxAttempts?: number;
  delay?: number;
  createdAt: Date;
  scheduledFor?: Date;
}

export interface DocumentUpdateJob {
  documentId: string;
  userId: string;
  updates: {
    title?: string;
    content?: string;
  };
  metadata?: {
    clientId?: string;
    sessionId?: string;
    timestamp: string;
  };
}

export interface QueueConfig {
  maxAttempts?: number;
  retryDelay?: number;
  jobTimeout?: number;
}

export class QueueService {
  private static readonly DEFAULT_MAX_ATTEMPTS = 3;
  private static readonly DEFAULT_RETRY_DELAY = 5000; // 5 seconds
  private static readonly DEFAULT_JOB_TIMEOUT = 30000; // 30 seconds
  private static readonly QUEUE_NAMES = {
    DOCUMENT_UPDATES: 'document-updates',
    FAILED_JOBS: 'failed-jobs',
    PROCESSING_JOBS: 'processing-jobs',
  } as const;

  /**
   * Add a document update job to the queue
   */
  static async addDocumentUpdateJob(
    jobData: DocumentUpdateJob,
    config?: QueueConfig
  ): Promise<string> {
    const client = RedisService.getClient();
    const jobId = this.generateJobId();
    
    const job: QueueJob<DocumentUpdateJob> = {
      id: jobId,
      type: 'document-update',
      data: jobData,
      priority: 1,
      attempts: 0,
      maxAttempts: config?.maxAttempts || this.DEFAULT_MAX_ATTEMPTS,
      delay: config?.retryDelay || this.DEFAULT_RETRY_DELAY,
      createdAt: new Date(),
    };

    // Add job to the queue
    await client.lPush(this.QUEUE_NAMES.DOCUMENT_UPDATES, JSON.stringify(job));
    
    console.log(`📝 Added document update job ${jobId} to queue for document ${jobData.documentId}`);
    
    return jobId;
  }

  /**
   * Process the next job from the queue
   */
  static async processNextJob(): Promise<QueueJob | null> {
    const client = RedisService.getClient();
    
    // Get the next job from the queue (non-blocking)
    const jobData = await client.lPop(this.QUEUE_NAMES.DOCUMENT_UPDATES);
    
    if (!jobData) {
      return null;
    }

    const job: QueueJob = JSON.parse(jobData);
    
    // Move job to processing queue
    await client.hSet(
      this.QUEUE_NAMES.PROCESSING_JOBS,
      job.id,
      JSON.stringify({ ...job, processingStartedAt: new Date() })
    );

    console.log(`🔄 Processing job ${job.id} (type: ${job.type})`);
    
    return job;
  }

  /**
   * Mark a job as completed
   */
  static async completeJob(jobId: string): Promise<void> {
    const client = RedisService.getClient();
    
    // Remove from processing queue
    await client.hDel(this.QUEUE_NAMES.PROCESSING_JOBS, jobId);
    
    console.log(`✅ Completed job ${jobId}`);
  }

  /**
   * Mark a job as failed and handle retries
   */
  static async failJob(jobId: string, error: string, job?: QueueJob): Promise<void> {
    const client = RedisService.getClient();
    
    if (!job) {
      // Try to get job from processing queue
      const jobData = await client.hGet(this.QUEUE_NAMES.PROCESSING_JOBS, jobId);
      if (jobData) {
        job = JSON.parse(jobData);
      }
    }

    if (!job) {
      console.error(`❌ Job ${jobId} not found in processing queue`);
      return;
    }

    // Remove from processing queue
    await client.hDel(this.QUEUE_NAMES.PROCESSING_JOBS, jobId);

    // Increment attempts
    job.attempts = (job.attempts || 0) + 1;

    if (job.attempts < (job.maxAttempts || this.DEFAULT_MAX_ATTEMPTS)) {
      // Retry the job
      job.scheduledFor = new Date(Date.now() + (job.delay || this.DEFAULT_RETRY_DELAY));
      
      // Add back to queue with delay
      setTimeout(async () => {
        await client.lPush(this.QUEUE_NAMES.DOCUMENT_UPDATES, JSON.stringify(job));
        console.log(`🔄 Retrying job ${jobId} (attempt ${job.attempts}/${job.maxAttempts})`);
      }, job.delay || this.DEFAULT_RETRY_DELAY);
    } else {
      // Move to failed jobs queue
      const failedJob = {
        ...job,
        error,
        failedAt: new Date(),
      };
      
      await client.lPush(this.QUEUE_NAMES.FAILED_JOBS, JSON.stringify(failedJob));
      console.error(`❌ Job ${jobId} failed permanently after ${job.attempts} attempts: ${error}`);
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
  }> {
    const client = RedisService.getClient();
    
    const [pending, processing, failed] = await Promise.all([
      client.lLen(this.QUEUE_NAMES.DOCUMENT_UPDATES),
      client.hLen(this.QUEUE_NAMES.PROCESSING_JOBS),
      client.lLen(this.QUEUE_NAMES.FAILED_JOBS),
    ]);

    return {
      pending,
      processing,
      failed,
    };
  }

  /**
   * Get failed jobs
   */
  static async getFailedJobs(limit: number = 10): Promise<QueueJob[]> {
    const client = RedisService.getClient();
    
    const failedJobsData = await client.lRange(this.QUEUE_NAMES.FAILED_JOBS, 0, limit - 1);
    
    return failedJobsData.map(jobData => JSON.parse(jobData));
  }

  /**
   * Retry a failed job
   */
  static async retryFailedJob(jobId: string): Promise<boolean> {
    const client = RedisService.getClient();
    
    // Get all failed jobs
    const failedJobsData = await client.lRange(this.QUEUE_NAMES.FAILED_JOBS, 0, -1);
    
    for (let i = 0; i < failedJobsData.length; i++) {
      const jobDataString = failedJobsData[i];
      if (!jobDataString) continue;
      
      const jobData = JSON.parse(jobDataString);
      
      if (jobData.id === jobId) {
        // Remove from failed jobs
        await client.lRem(this.QUEUE_NAMES.FAILED_JOBS, 1, jobDataString);
        
        // Reset attempts and add back to queue
        const retryJob = {
          ...jobData,
          attempts: 0,
          scheduledFor: undefined,
          error: undefined,
          failedAt: undefined,
        };
        
        await client.lPush(this.QUEUE_NAMES.DOCUMENT_UPDATES, JSON.stringify(retryJob));
        
        console.log(`🔄 Retrying failed job ${jobId}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Clear all queues (for testing/cleanup)
   */
  static async clearAllQueues(): Promise<void> {
    const client = RedisService.getClient();
    
    await Promise.all([
      client.del(this.QUEUE_NAMES.DOCUMENT_UPDATES),
      client.del(this.QUEUE_NAMES.FAILED_JOBS),
      client.del(this.QUEUE_NAMES.PROCESSING_JOBS),
    ]);
    
    console.log('🧹 Cleared all queues');
  }

  /**
   * Generate a unique job ID
   */
  private static generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 