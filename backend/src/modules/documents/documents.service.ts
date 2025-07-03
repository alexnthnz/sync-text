import { 
  CreateDocumentRequest, 
  UpdateDocumentRequest, 
  AddCollaboratorRequest,
  DocumentResponse,
  DocumentListResponse,
  DocumentCollaborator,
  UserRole
} from './documents.types';
import { EditHistoryService } from '../edit-history/edit-history.service';
import { PrismaService } from '../../shared/services/prisma.service';

const prisma = PrismaService.getClient();

export class DocumentsService {
  /**
   * Get documents based on filter criteria with pagination
   */
  static async getDocuments(
    userId: string, 
    filter: 'owned' | 'accessible' | 'shared' = 'accessible',
    search?: string,
    limit: number = 20,
    page: number = 1,
    cursor?: string
  ): Promise<{
    documents: DocumentListResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Build where clause based on filter
    let whereClause: any;
    
    if (filter === 'owned') {
      // Only documents owned by the user
      whereClause = { ownerId: userId };
    } else if (filter === 'shared') {
      // Only documents shared with user (not owned by user)
      whereClause = {
        AND: [
          { ownerId: { not: userId } }, // Not owned by user
          {
            documentUsers: {
              some: {
                userId: userId,
                role: { in: ['editor', 'viewer'] }, // Only editor/viewer roles
              },
            },
          },
        ],
      };
    } else {
      // 'accessible' - Documents owned by user OR shared with user
      whereClause = {
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
      };
    }

    // Add search filter if provided
    if (search) {
      const searchCondition = {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { content: { contains: search, mode: 'insensitive' as const } },
        ],
      };

      // Combine search with existing where clause
      whereClause = {
        AND: [whereClause, searchCondition],
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.document.count({
      where: whereClause,
    });

    // Calculate pagination values
    const currentPage = page || 1;
    const skip = (currentPage - 1) * limit;

    // Build query options
    const queryOptions: any = {
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            documentUsers: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1, // Take one extra to check if there's a next page
    };

    // Use cursor-based pagination if cursor is provided, otherwise use offset
    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1; // Skip the cursor itself
    } else if (page && page > 1) {
      queryOptions.skip = skip;
    }

    const documents = await prisma.document.findMany(queryOptions);

    // Check if there's a next page
    const hasNext = documents.length > limit;
    const documentList = hasNext ? documents.slice(0, -1) : documents;

    const mappedDocuments = documentList.map(doc => ({
      id: doc.id,
      title: doc.title,
      ownerId: doc.ownerId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      owner: (doc as any).owner,
      collaboratorsCount: (doc as any)._count.documentUsers,
    }));

    return {
      documents: mappedDocuments,
      total: totalCount,
      page: currentPage,
      limit,
    };
  }

  /**
   * Create a new document
   */
  static async createDocument(userId: string, data: CreateDocumentRequest): Promise<DocumentResponse> {
    // Create document and owner relationship in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the document
      const document = await tx.document.create({
        data: {
          title: data.title,
          content: data.content || '',
          ownerId: userId,
          documentUsers: {
            create: {
              userId: userId,
              role: 'owner',
            },
          },
        },
      });

      // Return document with all relationships
      return await tx.document.findUnique({
        where: { id: document.id },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          documentUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });

    return {
      id: result!.id,
      title: result!.title,
      content: result!.content,
      ownerId: result!.ownerId,
      createdAt: result!.createdAt,
      updatedAt: result!.updatedAt,
      owner: result!.owner,
      collaborators: result!.documentUsers.map(du => ({
        userId: du.userId,
        role: du.role,
        user: du.user,
      })),
    };
  }

  /**
   * Get document details by ID
   */
  static async getDocumentById(documentId: string, userId: string): Promise<DocumentResponse | null> {
    // Check if user has access to this document (owner or collaborator)
    const hasAccess = await this.checkUserPermission(documentId, userId, ['owner', 'editor', 'viewer']);
    if (!hasAccess) {
      return null;
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        documentUsers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      return null;
    }

    return {
      id: document.id,
      title: document.title,
      content: document.content,
      ownerId: document.ownerId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      owner: document.owner,
      collaborators: document.documentUsers.map(du => ({
        userId: du.userId,
        role: du.role,
        user: du.user,
      })),
    };
  }

  /**
   * Update document
   */
  static async updateDocument(
    documentId: string, 
    userId: string, 
    data: UpdateDocumentRequest
  ): Promise<DocumentResponse | null> {
    // Check if user has edit permission (owner or editor)
    const hasPermission = await this.checkUserPermission(documentId, userId, ['owner', 'editor']);
    if (!hasPermission) {
      return null;
    }

    // Build update data object
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;

    const document = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        documentUsers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const result = {
      id: document.id,
      title: document.title,
      content: document.content,
      ownerId: document.ownerId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      owner: document.owner,
      collaborators: document.documentUsers.map(du => ({
        userId: du.userId,
        role: du.role,
        user: du.user,
      })),
    };
    
    // Edit history is now recorded by the queue worker after successful processing
    // This ensures edit history is only recorded when the update actually succeeds
    
    return result;
  }

  /**
   * Delete document (only owner can delete)
   */
  static async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    // Check if user is the owner
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });

    if (!document || document.ownerId !== userId) {
      return false;
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    return true;
  }

  /**
   * Add collaborator to document
   */
  static async addCollaborator(
    documentId: string, 
    ownerId: string, 
    data: AddCollaboratorRequest
  ): Promise<DocumentCollaborator | null> {
    // Check if requester is the document owner
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });

    if (!document || document.ownerId !== ownerId) {
      throw new Error('Only document owner can add collaborators');
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    if (!userToAdd) {
      throw new Error('User not found');
    }

    // Check if user is the document owner
    if (userToAdd.id === ownerId) {
      throw new Error('Cannot add document owner as collaborator - they already have owner access');
    }

    // Check if user is already a collaborator
    const existingCollaborator = await prisma.documentUser.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingCollaborator) {
      throw new Error('User is already a collaborator');
    }

    // Add collaborator (role can only be 'editor' or 'viewer', not 'owner')
    const role = data.role === 'owner' ? 'editor' : (data.role || 'editor');
    
    const collaborator = await prisma.documentUser.create({
      data: {
        documentId,
        userId: userToAdd.id,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return {
      userId: collaborator.userId,
      role: collaborator.role,
      user: collaborator.user,
    };
  }

  /**
   * Remove collaborator from document
   */
  static async removeCollaborator(
    documentId: string, 
    ownerId: string, 
    collaboratorId: string
  ): Promise<boolean> {
    // Check if requester is the document owner
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });

    if (!document || document.ownerId !== ownerId) {
      return false;
    }

    // Check if collaborator exists
    const collaborator = await prisma.documentUser.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId: collaboratorId,
        },
      },
    });

    if (!collaborator) {
      return false;
    }

    // Remove collaborator
    await prisma.documentUser.delete({
      where: {
        documentId_userId: {
          documentId,
          userId: collaboratorId,
        },
      },
    });

    return true;
  }

  /**
   * Check if user has permission to perform action on document
   */
  static async checkUserPermission(
    documentId: string, 
    userId: string, 
    requiredRoles: UserRole[]
  ): Promise<boolean> {
    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });

    if (!document) {
      return false;
    }

    // First check if user is the direct owner (fallback for existing data)
    if (document.ownerId === userId && requiredRoles.includes('owner')) {
      return true;
    }

    // Check user's role in the pivot table (preferred method)
    const userRole = await prisma.documentUser.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!userRole) {
      return false;
    }

    return requiredRoles.includes(userRole.role);
  }

  /**
   * Record edit history for document changes
   */
  private static async recordEditHistory(
    documentId: string,
    userId: string,
    data: UpdateDocumentRequest
  ): Promise<void> {
    try {
      const operation = {
        type: 'document_update',
        changes: {
          title: data.title !== undefined ? { changed: true, value: data.title } : { changed: false },
          content: data.content !== undefined ? { changed: true, value: data.content } : { changed: false },
        },
        timestamp: new Date().toISOString(),
      };

      await EditHistoryService.createEditHistory(userId, {
        documentId,
        operation,
        version: Date.now(), // Use timestamp as version
      });
    } catch (error) {
      // Log error but don't fail the document update
      console.error('Failed to record edit history:', error);
    }
  }
} 