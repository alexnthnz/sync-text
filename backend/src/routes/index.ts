import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import documentsRoutes from '../modules/documents/documents.routes';
import editHistoryRoutes from '../modules/edit-history/edit-history.routes';
import queueRoutes from '../modules/queue/queue.routes';
// Import other route modules here

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/documents', documentsRoutes);
router.use('/edit-history', editHistoryRoutes);
router.use('/queue', queueRoutes);
// Add other routes here

export default router;
