import { Router } from 'express';
import { EditHistoryController } from './edit-history.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validation.middleware';
import {
  createEditHistorySchema,
  getEditHistoryQuerySchema,
  editHistoryIdParamSchema,
  documentEditHistoryParamSchema,
} from './edit-history.validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireAuth);

// Create edit history entry
router.post('/', validateBody(createEditHistorySchema), EditHistoryController.createEditHistory);

// Get edit history with optional filtering and pagination
router.get('/', validateQuery(getEditHistoryQuerySchema), EditHistoryController.getEditHistory);

// Get edit history for a specific document
router.get('/document/:documentId', 
  validateParams(documentEditHistoryParamSchema), 
  validateQuery(getEditHistoryQuerySchema), 
  EditHistoryController.getDocumentEditHistory
);

// Get a specific edit history entry by ID
router.get('/:id', 
  validateParams(editHistoryIdParamSchema), 
  EditHistoryController.getEditHistoryById
);

export default router; 