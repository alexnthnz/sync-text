import { Router } from 'express';
import { QueueController } from './queue.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validateParams } from '../../shared/middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireAuth);

// Get queue statistics
router.get('/stats', QueueController.getQueueStats);

// Get failed jobs
router.get('/failed', QueueController.getFailedJobs);

// Retry a failed job
router.post('/failed/:jobId/retry', 
  validateParams(z.object({ 
    jobId: z.string().regex(/^job_\d+_[a-z0-9]+$/, 'Invalid job ID format') 
  })), 
  QueueController.retryFailedJob
);

// Clear all queues (admin only)
router.delete('/clear', QueueController.clearAllQueues);

// Get worker status
router.get('/worker/status', QueueController.getWorkerStatus);

export default router; 