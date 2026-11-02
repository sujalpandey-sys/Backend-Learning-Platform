export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface UserResponse {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_seconds: number;
}

export interface LogoutResponse {
  message: string;
  revoked_jti: string | null;
  note: string;
}

export interface TaskResponse {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface TaskPaginationResponse {
  total: number;
  limit: number;
  offset: number;
  items: TaskResponse[];
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
}

export interface TaskQueryParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'title' | 'priority' | 'status';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ApiErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface BackendErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    request_id?: string;
  };
}

export interface HealthReadyResponse {
  status: string;
  environment: string;
  database: string;
  redis: string;
}
