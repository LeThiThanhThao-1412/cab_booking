import { apiClient } from './client'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  phone: string
  role?: 'customer' | 'driver'
}

export interface UserProfile {
  id: string
  email: string
  name: string
  fullName?: string  // 👈 Thêm optional fullName
  role: string
  phone?: string
  avatar?: string
  createdAt?: string
}

export const authAPI = {
  login: async (data: LoginRequest) => {
    const response = await apiClient.post('/auth/login', data)
    console.log('🔍 Login response:', response.data)
    return response
  },
  
  register: async (data: RegisterRequest) => {
    const response = await apiClient.post('/auth/register', data)
    console.log('🔍 Register response:', response.data)
    return response
  },
  
  logout: () => apiClient.post('/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
  
  getProfile: async (): Promise<UserProfile> => {
    const token = localStorage.getItem('accessToken')
    console.log('🔑 Token for profile:', token ? `${token.slice(0, 20)}...` : 'MISSING')
    
    const response = await apiClient.get('/auth/profile')
    console.log('🔍 Profile response:', response.data)
    
    // Xử lý response có thể có wrapper { data: ... }
    const data = response.data.data || response.data
    return data
  },
  
  updateProfile: (data: Partial<UserProfile>) =>
    apiClient.patch('/auth/profile', data),
  
  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword }),
}