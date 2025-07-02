import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentRequest, UpdateDocumentRequest, AddCollaboratorRequest } from './documents.types';
import { ResponseHelper } from '../../shared/utils/response.utils';

export class DocumentsController {
  /**
   * Get documents with optional filtering and search
   */
  static async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      
      // Apply defaults for optional parameters
      const filter = query.filter || 'accessible';
      const search = query.search;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;
      const page = query.page ? parseInt(query.page, 10) : 1;
      const cursor = query.cursor;

      const result = await DocumentsService.getDocuments(
        req.userId!,
        filter,
        search,
        limit,
        page,
        cursor
      );
      
      // Generate appropriate message based on filter
      let message: string;
      switch (filter) {
        case 'owned':
          message = 'Owned documents retrieved successfully';
          break;
        case 'shared':
          message = 'Shared documents retrieved successfully';
          break;
        default:
          message = 'Accessible documents retrieved successfully';
      }
      
      ResponseHelper.paginated(
        res,
        result.documents,
        result.total,
        { page: result.page, limit: result.limit },
        message
      );
    } catch (error) {
      console.error('Get documents error:', error);
      ResponseHelper.internalError(res, 'Failed to retrieve documents', error);
    }
  }

  /**
   * Create a new document
   */
  static async createDocument(req: Request, res: Response): Promise<void> {
    try {
      const { title, content }: CreateDocumentRequest = req.body;

      const document = await DocumentsService.createDocument(req.userId!, { title: title.trim(), content });
      
      ResponseHelper.created(res, document, 'Document created successfully');
    } catch (error) {
      console.error('Create document error:', error);
      ResponseHelper.internalError(res, 'Failed to create document', error);
    }
  }

  /**
   * Get document details by ID
   */
  static async getDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const document = await DocumentsService.getDocumentById(id!, req.userId!);

      if (!document) {
        ResponseHelper.notFound(res, 'Document not found or access denied');
        return;
      }

      ResponseHelper.success(res, document, 'Document retrieved successfully');
    } catch (error) {
      console.error('Get document error:', error);
      ResponseHelper.internalError(res, 'Failed to retrieve document', error);
    }
  }

  /**
   * Update document
   */
  static async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content }: UpdateDocumentRequest = req.body;

      const document = await DocumentsService.updateDocument(id!, req.userId!, { title, content });

      if (!document) {
        ResponseHelper.notFound(res, 'Document not found or insufficient permissions');
        return;
      }

      ResponseHelper.success(res, document, 'Document updated successfully');
    } catch (error) {
      console.error('Update document error:', error);
      ResponseHelper.internalError(res, 'Failed to update document', error);
    }
  }

  /**
   * Delete document (only owner can delete)
   */
  static async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await DocumentsService.deleteDocument(id!, req.userId!);

      if (!deleted) {
        ResponseHelper.notFound(res, 'Document not found or insufficient permissions');
        return;
      }

      ResponseHelper.success(res, null, 'Document deleted successfully');
    } catch (error) {
      console.error('Delete document error:', error);
      ResponseHelper.internalError(res, 'Failed to delete document', error);
    }
  }

  /**
   * Add collaborator to document
   */
  static async addCollaborator(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email, role }: AddCollaboratorRequest = req.body;

      const collaborator = await DocumentsService.addCollaborator(id!, req.userId!, { email, role });

      ResponseHelper.success(res, collaborator, 'Collaborator added successfully');
    } catch (error) {
      console.error('Add collaborator error:', error);
      
      if (error instanceof Error) {
        const message = error.message;
        if (message === 'Only document owner can add collaborators') {
          ResponseHelper.forbidden(res, message);
          return;
        }
        if (message === 'User not found') {
          ResponseHelper.notFound(res, message);
          return;
        }
        if (message === 'User is already a collaborator' || message.includes('Cannot add document owner')) {
          ResponseHelper.conflict(res, message);
          return;
        }
      }
      
      ResponseHelper.internalError(res, 'Failed to add collaborator', error);
    }
  }

  /**
   * Remove collaborator from document
   */
  static async removeCollaborator(req: Request, res: Response): Promise<void> {
    try {
      const { id, collaboratorId } = req.params;

      const removed = await DocumentsService.removeCollaborator(id!, req.userId!, collaboratorId!);

      if (!removed) {
        ResponseHelper.notFound(res, 'Document not found, collaborator not found, or insufficient permissions');
        return;
      }

      ResponseHelper.success(res, null, 'Collaborator removed successfully');
    } catch (error) {
      console.error('Remove collaborator error:', error);
      ResponseHelper.internalError(res, 'Failed to remove collaborator', error);
    }
  }

  /**
   * Get currently connected users for a document
   */
  static async getConnectedUsers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // First verify user has access to the document
      const document = await DocumentsService.getDocumentById(id!, req.userId!);
      if (!document) {
        ResponseHelper.notFound(res, 'Document not found or access denied');
        return;
      }

      ResponseHelper.success(res, null, 'Connected users retrieved successfully');
    } catch (error) {
      console.error('Get connected users error:', error);
      ResponseHelper.internalError(res, 'Failed to retrieve connected users', error);
    }
  }
} 