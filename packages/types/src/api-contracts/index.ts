export interface ApiV1PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiV1ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiV1SuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiV1PaginationMeta;
}

export interface ApiV1ErrorResponse {
  success: false;
  error: ApiV1ErrorDetails;
}

export type ApiV1Response<T> = ApiV1SuccessResponse<T> | ApiV1ErrorResponse;

// Future API Version Envelope (V2 Contract Draft)
export interface ApiV2Response<T> {
  apiVersion: '2.0';
  success: boolean;
  result?: T;
  errors?: ApiV1ErrorDetails[];
  meta?: Record<string, unknown>;
}
