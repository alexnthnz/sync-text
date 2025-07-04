import { QueueService, QueueJob, DocumentUpdateJob } from './queue.service';
import { DocumentsService } from '../../modules/documents/documents.service';
import { EditHistoryService } from '../../modules/edit-history/edit-history.service';
import { RedisService } from './redis.service';

export class QueueWorkerService {
  private static isRunning = false;
  private static processingInterval: NodeJS.Timeout | null = null;
  private static readonly PROCESSING_INTERVAL = 1000; // 1 second

  /**
   * Start the queue worker
   */
  static start(): void {
    if (this.isRunning) {
      console.log('⚠️ Queue worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting queue worker...');

    this.processingInterval = setInterval(async () => {
      await this.processNextJob();
    }, this.PROCESSING_INTERVAL);
  }

  /**
   * Stop the queue worker
   */
  static stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Queue worker is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('🛑 Queue worker stopped');
  }

  /**
   * Process the next job from the queue
   */
  private static async processNextJob(): Promise<void> {
    try {
      const job = await QueueService.processNextJob();
      
      if (!job) {
        return;
      }

      await this.handleJob(job);
    } catch (error) {
      console.error('❌ Error processing job:', error);
    }
  }

  /**
   * Handle a specific job based on its type
   */
  private static async handleJob(job: QueueJob): Promise<void> {
    try {
      switch (job.type) {
        case 'document-update':
          await this.handleDocumentUpdateJob(job);
          break;
        default:
          console.warn(`⚠️ Unknown job type: ${job.type}`);
          await QueueService.failJob(job.id, `Unknown job type: ${job.type}`, job);
      }
    } catch (error) {
      console.error(`❌ Error handling job ${job.id}:`, error);
      await QueueService.failJob(job.id, error instanceof Error ? error.message : 'Unknown error', job);
    }
  }

  /**
   * Handle document update job
   */
  private static async handleDocumentUpdateJob(job: QueueJob<DocumentUpdateJob>): Promise<void> {
    const { documentId, userId, updates, metadata } = job.data;

    try {
      const updatedDocument = await DocumentsService.updateDocument(documentId, userId, updates);

      if (!updatedDocument) {
        throw new Error('Document update failed - document not found or insufficient permissions');
      }

      await RedisService.cacheDocumentContent(
        documentId, 
        updatedDocument.content, 
        updatedDocument.title
      );

      const operation = {
        type: 'document_update',
        changes: {
          title: updates.title !== undefined ? { changed: true, value: updates.title } : { changed: false },
          content: updates.content !== undefined ? { changed: true, value: updates.content } : { changed: false },
        },
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          jobId: job.id,
          processedAt: new Date().toISOString(),
          cachedAt: new Date().toISOString(),
        },
      };

      await EditHistoryService.createEditHistory(userId, {
        documentId,
        operation,
        version: Date.now(),
      });

      await QueueService.completeJob(job.id);

      console.log(`✅ Successfully processed document update job ${job.id} and cached content`);
    } catch (error) {
      console.error(`❌ Failed to process document update job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Get worker status
   */
  static getStatus(): {
    isRunning: boolean;
    processingInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      processingInterval: this.PROCESSING_INTERVAL,
    };
  }

  /**
   * Process a single job immediately (for testing/debugging)
   */
  static async processJobImmediately(jobId: string): Promise<boolean> {
    try {
      // This is a simplified version - in a real implementation,
      // you might want to get the job from the processing queue
      console.log(`🔧 Processing job ${jobId} immediately`);
      
      // For now, we'll just return true as this is mainly for testing
      return true;
    } catch (error) {
      console.error(`❌ Error processing job ${jobId} immediately:`, error);
      return false;
    }
  }
} 