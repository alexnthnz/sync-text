export type UserRole = 'owner' | 'editor' | 'viewer';

export interface DocumentResponse {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: {
    id: string;
    username: string;
    email: string;
  };
  collaborators?: DocumentCollaborator[];
}

export interface DocumentCollaborator {
  userId: string;
  role: UserRole;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface CreateDocumentRequest {
  title: string;
  content?: string | undefined;
}

export interface UpdateDocumentRequest {
  title?: string | undefined;
  content?: string | undefined;
}

export interface AddCollaboratorRequest {
  email: string;
  role?: UserRole | undefined;
}

export interface DocumentListResponse {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    username: string;
    email: string;
  };
  collaboratorsCount: number;
} 