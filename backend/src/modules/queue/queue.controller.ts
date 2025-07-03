import { Request, Response } from 'express';
import { QueueService } from '../../shared/services/queue.service';
import { QueueWorkerService } from '../../shared/services/queue-worker.service';
import { ResponseHelper } from '../../shared/utils/response.utils';

export class QueueController {
  /**
   * Get queue statistics
   */
  static async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await QueueService.getQueueStats();
      const workerStatus = QueueWorkerService.getStatus();

      ResponseHelper.success(res, {
        ...stats,
        worker: workerStatus,
      }, 'Queue statistics retrieved successfully');
    } catch (error) {
      console.error('Get queue stats error:', error);
      ResponseHelper.internalError(res, 'Failed to retrieve queue statistics', error);
    }
  }

  /**
   * Get failed jobs
   */
  static async getFailedJobs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const failedJobs = await QueueService.getFailedJobs(limit);

      ResponseHelper.success(res, { failedJobs }, 'Failed jobs retrieved successfully');
    } catch (error) {
      console.error('Get failed jobs error:', error);
      ResponseHelper.internalError(res, 'Failed to retrieve failed jobs', error);
    }
  }

  /**
   * Retry a failed job
   */
  static async retryFailedJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        ResponseHelper.badRequest(res, 'Job ID is required');
        return;
      }

      const success = await QueueService.retryFailedJob(jobId);

      if (success) {
        ResponseHelper.success(res, null, 'Job retried successfully');
      } else {
        ResponseHelper.notFound(res, 'Failed job not found');
      }
    } catch (error) {
      console.error('Retry failed job error:', error);
      ResponseHelper.internalError(res, 'Failed to retry job', error);
    }
  }

  /**
   * Clear all queues (admin only)
   */
  static async clearAllQueues(req: Request, res: Response): Promise<void> {
    try {
      await QueueService.clearAllQueues();

      ResponseHelper.success(res, null, 'All queues cleared successfully');
    } catch (error) {
      console.error('Clear queues error:', error);
      ResponseHelper.internalError(res, 'Failed to clear queues', error);
    }
  }

  /**
   * Get worker status
   */
  static async getWorkerStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = QueueWorkerService.getStatus();

      ResponseHelper.success(res, status, 'Worker status retrieved successfully');
    } catch (error) {
      console.error('Get worker status error:', error);
      ResponseHelper.internalError(res, 'Failed to retrieve worker status', error);
    }
  }
} 