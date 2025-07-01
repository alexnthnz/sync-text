export interface ApiResponse<T = any> {
  data?: T;
  meta?: ResponseMeta;
  error?: ResponseError;
  message: string;
  status_code: number;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface ResponseError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  stack?: string; // Only in development
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ErrorResponse extends ApiResponse {
  data?: never;
  error: ResponseError;
} 