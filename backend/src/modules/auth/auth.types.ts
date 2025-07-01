export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface LoginResponse {
  token: string;
  expire_at: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
} 