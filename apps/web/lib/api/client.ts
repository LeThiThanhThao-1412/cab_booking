import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

interface TokenResponse {
  accessToken: string
  refreshToken: string
}

interface QueueItem {
  resolve: (token: string) => void
  reject: (error: any) => void
}

let isRefreshing = false
let failedQueue: QueueItem[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`)
    
    const isPublicEndpoint = config.url?.includes('/auth/login') || 
                            config.url?.includes('/auth/register') ||
                            config.url?.includes('/auth/refresh')
    
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('accessToken')
      console.log(`🔑 Token for ${config.url}:`, token ? `${token.slice(0, 20)}...` : 'MISSING')
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        console.warn(`⚠️ No token for ${config.url}`)
      }
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`)
    return response
  },
  async (error: AxiosError) => {
    console.error(`❌ ${error.response?.status} ${error.config?.url}`, error.response?.data)
    
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/auth/')
      if (isAuthEndpoint) {
        return Promise.reject(error)
      }
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }
      
      originalRequest._retry = true
      isRefreshing = true
      
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        
        if (!refreshToken) {
          throw new Error('No refresh token')
        }
        
        const response = await axios.post<TokenResponse>(
          `${API_URL}/auth/refresh`,
          { refreshToken }
        )
        
        const { accessToken, refreshToken: newRefreshToken } = response.data
        
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefreshToken)
        
        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        
        processQueue(null, accessToken)
        isRefreshing = false
        
        return apiClient(originalRequest)
        
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('auth-storage')
        
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
          window.location.href = '/auth/login'
        }
        
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)