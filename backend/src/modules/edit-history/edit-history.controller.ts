import { Request, Response } from 'express';
import { EditHistoryService } from './edit-history.service';
import { CreateEditHistoryRequest } from './edit-history.types';
import { ResponseHelper } from '../../shared/utils/response.utils';

export class EditHistoryController {
  /**
   * Create a new edit history entry
   */
  static async createEditHistory(req: Request, res: Response): Promise<void> {
    try {
      const { documentId, operation, version }: CreateEditHistoryRequest = req.body;

      const editHistory = await EditHistoryService.createEditHistory(req.userId!, {
        documentId,
        operation,
        version,
      });

      ResponseHelper.created(res, editHistory, 'Edit history created successfully');
    } catch (error) {
      console.error('Create edit history error:', error);

      if (error instanceof Error) {
        if (error.message === 'Access denied to document') {
          ResponseHelper.forbidden(res, error.message);
          return;
        }
      }

      ResponseHelper.internalError(res, 'Failed to create edit history', error);
    }
  }

  /**
   * Get edit history with optional filtering and pagination
   */
  static async getEditHistory(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      
      // Apply defaults for optional parameters
      const limit = query.limit ? parseInt(query.limit, 10) : 20;
      const page = query.page ? parseInt(query.page, 10) : 1;
      const cursor = query.cursor;
      const documentId = query.documentId;
      const userId = query.userId;
      const startDate = query.startDate;
      const endDate = query.endDate;

      const result = await EditHistoryService.getEditHistory(req.userId!, {
        documentId,
        userId,
        limit,
        page,
        cursor,
        startDate,
        endDate,
      });
      
      ResponseHelper.paginated(
        res,
        result.editHistory,
        result.total,
        { page: result.page, limit: result.limit },
        'Edit history retrieved successfully'
      );
    } catch (error) {
      console.error('Get edit history error:', error);

      if (error instanceof Error) {
        if (error.message === 'Access denied to document') {
          ResponseHelper.forbidden(res, error.message);
          return;
        }
      }

      ResponseHelper.internalError(res, 'Failed to retrieve edit history', error);
    }
  }

  /**
   * Get edit history for a specific document
   */
  static async getDocumentEditHistory(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const query = req.query as any;
      
      const limit = query.limit ? parseInt(query.limit, 10) : 50;
      const page = query.page ? parseInt(query.page, 10) : 1;

      const result = await EditHistoryService.getDocumentEditHistory(
        documentId!,
        req.userId!,
        limit,
        page
      );
      
      ResponseHelper.paginated(
        res,
        result.editHistory,
        result.total,
        { page: result.page, limit: result.limit },
        'Document edit history retrieved successfully'
      );
    } catch (error) {
      console.error('Get document edit history error:', error);

      if (error instanceof Error) {
        if (error.message === 'Access denied to document') {
          ResponseHelper.forbidden(res, error.message);
          return;
        }
      }

      ResponseHelper.internalError(res, 'Failed to retrieve document edit history', error);
    }
  }



  /**
   * Get a specific edit history entry by ID
   */
  static async getEditHistoryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const editHistory = await EditHistoryService.getEditHistoryById(id!, req.userId!);

      if (!editHistory) {
        ResponseHelper.notFound(res, 'Edit history entry not found or access denied');
        return;
      }

      ResponseHelper.success(res, editHistory, 'Edit history entry retrieved successfully');
    } catch (error) {
      console.error('Get edit history by ID error:', error);

      if (error instanceof Error) {
        if (error.message === 'Access denied to document') {
          ResponseHelper.forbidden(res, error.message);
          return;
        }
      }

      ResponseHelper.internalError(res, 'Failed to retrieve edit history entry', error);
    }
  }


} 