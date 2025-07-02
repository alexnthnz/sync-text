import { Router } from 'express';
import { DocumentsController } from './documents.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validation.middleware';
import {
  createDocumentSchema,
  updateDocumentSchema,
  addCollaboratorSchema,
  getDocumentsQuerySchema,
  documentIdParamSchema,
  collaboratorParamSchema,
} from './documents.validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireAuth);

// Document routes
router.get('/', validateQuery(getDocumentsQuerySchema), DocumentsController.getDocuments);
router.post('/', validateBody(createDocumentSchema), DocumentsController.createDocument);
router.get('/:id', validateParams(documentIdParamSchema), DocumentsController.getDocumentById);
router.put('/:id', validateParams(documentIdParamSchema), validateBody(updateDocumentSchema), DocumentsController.updateDocument);
router.delete('/:id', validateParams(documentIdParamSchema), DocumentsController.deleteDocument);

// Collaborator routes
router.post('/:id/collaborators', validateParams(documentIdParamSchema), validateBody(addCollaboratorSchema), DocumentsController.addCollaborator);
router.delete('/:id/collaborators/:collaboratorId', validateParams(collaboratorParamSchema), DocumentsController.removeCollaborator);

// WebSocket related routes
router.get('/:id/connected-users', validateParams(documentIdParamSchema), DocumentsController.getConnectedUsers);

export default router; 