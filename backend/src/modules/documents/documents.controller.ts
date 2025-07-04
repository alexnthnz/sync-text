import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateDocumentRequest, UpdateDocumentRequest, AddCollaboratorRequest } from './documents.types';
import { ResponseHelper } from '../../shared/utils/response.utils';
import { QueueService } from '../../shared/services/queue.service';
import { RedisService } from '../../shared/services/redis.service';

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
   * Update document (queued)
   */
  static async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content }: UpdateDocumentRequest = req.body;

      const document = await DocumentsService.getDocumentById(id!, req.userId!);
      if (!document) {
        ResponseHelper.notFound(res, 'Document not found or access denied');
        return;
      }

      const hasEditPermission = await DocumentsService.checkUserPermission(id!, req.userId!, ['owner', 'editor']);
      if (!hasEditPermission) {
        ResponseHelper.forbidden(res, 'Insufficient permissions to edit this document');
        return;
      }

      if (title === undefined && content === undefined) {
        ResponseHelper.badRequest(res, 'At least one field (title or content) must be provided');
        return;
      }

      // ✅ CHECK FOR CONTENT CHANGES BEFORE QUEUING
      const changeCheck = await RedisService.hasDocumentContentChanged(
        id!, 
        content || document.content, 
        title || document.title
      );

      if (!changeCheck.hasChanged) {
        console.log(`⏭️ Skipping update for document ${id} - no content changes detected`);
        ResponseHelper.success(
          res,
          {
            jobId: null,
            message: 'No changes detected - document is already up to date',
            status: 'skipped',
            reason: 'no_changes',
          },
          'No changes detected - document is already up to date'
        );
        return;
      }

      console.log(`📝 Content changes detected for document ${id}:`, {
        contentChanged: content !== undefined && content !== changeCheck.cachedContent,
        titleChanged: title !== undefined && title !== changeCheck.cachedTitle,
        previousContent: changeCheck.cachedContent?.substring(0, 100) + '...',
        newContent: content?.substring(0, 100) + '...',
      });

      const jobId = await QueueService.addDocumentUpdateJob({
        documentId: id!,
        userId: req.userId!,
        updates: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        },
        metadata: {
          clientId: req.headers['x-client-id'] as string,
          sessionId: req.headers['x-session-id'] as string,
          timestamp: new Date().toISOString(),
          permissionVerified: true,
          verifiedAt: new Date().toISOString(),
          changeDetection: {
            hasChanged: true,
            contentChanged: content !== undefined && content !== changeCheck.cachedContent,
            titleChanged: title !== undefined && title !== changeCheck.cachedTitle,
            previousVersion: changeCheck.cachedContent ? 'cached' : 'none',
          },
        },
      });

      ResponseHelper.success(
        res, 
        { 
          jobId,
          message: 'Document update queued successfully',
          status: 'queued'
        }, 
        'Document update queued successfully'
      );
    } catch (error) {
      console.error('Queue document update error:', error);
      ResponseHelper.internalError(res, 'Failed to queue document update', error);
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

      const document = await DocumentsService.getDocumentById(id!, req.userId!);
      if (!document) {
        ResponseHelper.notFound(res, 'Document not found or access denied');
        return;
      }

      const sessions = await global.webSocketService.getDocumentUsers(id!);
      
      ResponseHelper.success(res, { users: sessions }, 'Connected users retrieved successfully');
    } catch (error) {
      console.error('Get connected users error:', error);
      ResponseHelper.internalError(res, 'Failed to retrieve connected users', error);
    }
  }


} 