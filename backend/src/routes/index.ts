import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import documentsRoutes from '../modules/documents/documents.routes';
// Import other route modules here

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/documents', documentsRoutes);
// Add other routes here

export default router;
