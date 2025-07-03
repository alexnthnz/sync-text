import { 
  CreateEditHistoryRequest, 
  GetEditHistoryQuery,
  EditHistoryResponse,
  EditHistoryListResponse
} from './edit-history.types';
import { PrismaService } from '../../shared/services/prisma.service';

const prisma = PrismaService.getClient();

// Helper function to convert BigInt to number for JSON serialization
const convertBigIntToNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  return Number(value);
};

export class EditHistoryService {
  /**
   * Create a new edit history entry
   */
  static async createEditHistory(
    userId: string, 
    data: CreateEditHistoryRequest
  ): Promise<EditHistoryResponse> {
    // Verify user has access to the document
    const hasAccess = await this.checkUserPermission(data.documentId, userId, ['owner', 'editor']);
    if (!hasAccess) {
      throw new Error('Access denied to document');
    }

    const editHistory = await prisma.editHistory.create({
      data: {
        documentId: data.documentId,
        userId: userId,
        operation: data.operation,
        ...(data.version !== undefined && { version: data.version }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        document: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return {
      id: editHistory.id,
      documentId: editHistory.documentId,
      userId: editHistory.userId,
      operation: editHistory.operation,
      timestamp: editHistory.timestamp,
      version: convertBigIntToNumber(editHistory.version),
      user: editHistory.user,
      document: editHistory.document,
    };
  }

  /**
   * Get edit history with optional filtering and pagination
   */
  static async getEditHistory(
    userId: string,
    query: GetEditHistoryQuery
  ): Promise<{
    editHistory: EditHistoryListResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      documentId,
      limit = 20,
      page = 1,
      cursor,
      startDate,
      endDate,
    } = query;

    // Build where clause
    const whereClause: any = {};

    // If documentId is provided, check user has access to that document
    if (documentId) {
      const hasAccess = await this.checkUserPermission(documentId, userId, ['owner', 'editor', 'viewer']);
      if (!hasAccess) {
        throw new Error('Access denied to document');
      }
      whereClause.documentId = documentId;
    } else {
      // If no specific document, get edit history for all documents user has access to
      const accessibleDocuments = await this.getAccessibleDocumentIds(userId);
      whereClause.documentId = { in: accessibleDocuments };
    }

    // Add date range filter
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Get edit history with pagination
    const [editHistory, total] = await Promise.all([
      prisma.editHistory.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          document: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take,
        ...(cursor && { cursor: { id: cursor } }),
      }),
      prisma.editHistory.count({ where: whereClause }),
    ]);

    return {
      editHistory: editHistory.map(item => ({
        id: item.id,
        documentId: item.documentId,
        userId: item.userId,
        operation: item.operation,
        timestamp: item.timestamp,
        version: convertBigIntToNumber(item.version),
        user: item.user,
        document: item.document,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get edit history for a specific document
   */
  static async getDocumentEditHistory(
    documentId: string,
    userId: string,
    limit: number = 50,
    page: number = 1
  ): Promise<{
    editHistory: EditHistoryListResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Check user has access to the document
    const hasAccess = await this.checkUserPermission(documentId, userId, ['owner', 'editor', 'viewer']);
    if (!hasAccess) {
      throw new Error('Access denied to document');
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [editHistory, total] = await Promise.all([
      prisma.editHistory.findMany({
        where: { documentId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          document: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take,
      }),
      prisma.editHistory.count({ where: { documentId } }),
    ]);

    return {
      editHistory: editHistory.map(item => ({
        id: item.id,
        documentId: item.documentId,
        userId: item.userId,
        operation: item.operation,
        timestamp: item.timestamp,
        version: convertBigIntToNumber(item.version),
        user: item.user,
        document: item.document,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a specific edit history entry by ID
   */
  static async getEditHistoryById(
    id: string,
    userId: string
  ): Promise<EditHistoryResponse | null> {
    const editHistory = await prisma.editHistory.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        document: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!editHistory) {
      return null;
    }

    // Check user has access to the document
    const hasAccess = await this.checkUserPermission(editHistory.documentId, userId, ['owner', 'editor', 'viewer']);
    if (!hasAccess) {
      throw new Error('Access denied to document');
    }

    return {
      id: editHistory.id,
      documentId: editHistory.documentId,
      userId: editHistory.userId,
      operation: editHistory.operation,
      timestamp: editHistory.timestamp,
      version: convertBigIntToNumber(editHistory.version),
      user: editHistory.user,
      document: editHistory.document,
    };
  }

  /**
   * Check if user has permission to access a document
   */
  private static async checkUserPermission(
    documentId: string,
    userId: string,
    allowedRoles: string[]
  ): Promise<boolean> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        documentUsers: {
          where: { userId },
        },
      },
    });

    if (!document) {
      return false;
    }

    // Check if user is the owner
    if (document.ownerId === userId) {
      return true;
    }

    // Check if user has a role in the allowed roles
    const userRole = document.documentUsers[0]?.role;
    return userRole ? allowedRoles.includes(userRole) : false;
  }

  /**
   * Get all document IDs that a user has access to
   */
  private static async getAccessibleDocumentIds(userId: string): Promise<string[]> {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            documentUsers: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    return documents.map(doc => doc.id);
  }
} 