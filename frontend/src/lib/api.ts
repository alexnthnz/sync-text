import { getSession } from "next-auth/react"
import { Env } from "./env"

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await getSession()
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (session?.user?.token) {
      headers.Authorization = `Bearer ${session.user.token}`
    }

    return headers
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers = await this.getAuthHeaders()

    const config: RequestInit = {
      headers: {
        ...headers,
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  // POST request
  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT request
  async put<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }
}

// Create a singleton instance using the server-side env variable
export const api = new ApiClient(Env.BACKEND_URL)

// Specific API methods for your backend endpoints
export const authApi = {
  register: (data: { email: string; password: string }) =>
    api.post("/api/auth/register", data),
  
  profile: () => api.get("/api/auth/profile"),
  
  updateProfile: (data: { email?: string }) =>
    api.put("/api/auth/profile", data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/api/auth/change-password", data),
  
  logout: () => api.post("/api/auth/logout"),
}

export const documentsApi = {
  getDocuments: (params?: { filter?: "owned" | "accessible"; search?: string; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.filter) searchParams.set("filter", params.filter)
    if (params?.search) searchParams.set("search", params.search)
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    
    const queryString = searchParams.toString()
    return api.get(`/api/documents${queryString ? `?${queryString}` : ""}`)
  },
  
  createDocument: (data: { title: string; content?: string }) =>
    api.post("/api/documents", data),
  
  getDocument: (id: string) => api.get(`/api/documents/${id}`),
  
  updateDocument: (id: string, data: { title?: string; content?: string }) =>
    api.put(`/api/documents/${id}`, data),
  
  deleteDocument: (id: string) => api.delete(`/api/documents/${id}`),
  
  addCollaborator: (id: string, data: { email: string; role?: "editor" | "viewer" }) =>
    api.post(`/api/documents/${id}/collaborators`, data),
  
  removeCollaborator: (id: string, collaboratorId: string) =>
    api.delete(`/api/documents/${id}/collaborators/${collaboratorId}`),
} 