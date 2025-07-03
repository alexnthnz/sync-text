export interface EditHistoryResponse {
  id: string;
  documentId: string;
  userId: string;
  operation: any; // JSON operation data
  timestamp: Date;
  version: number | null;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  document?: {
    id: string;
    title: string;
  };
}

export interface EditHistoryListResponse {
  id: string;
  documentId: string;
  userId: string;
  operation: any;
  timestamp: Date;
  version: number | null;
  user: {
    id: string;
    username: string;
    email: string;
  };
  document: {
    id: string;
    title: string;
  };
}

export interface CreateEditHistoryRequest {
  documentId: string;
  operation: any;
  version?: number | undefined;
}

export interface GetEditHistoryQuery {
  documentId?: string;
  userId?: string;
  limit?: number;
  page?: number;
  cursor?: string;
  startDate?: string;
  endDate?: string;
}

 