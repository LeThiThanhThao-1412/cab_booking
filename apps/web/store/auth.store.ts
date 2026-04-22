import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI, LoginRequest, RegisterRequest, UserProfile } from '@/lib/api/auth'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  login: (data: LoginRequest) => Promise<boolean>
  register: (data: RegisterRequest) => Promise<boolean>
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      hydrate: () => {
        const token = localStorage.getItem('accessToken')
        if (token) {
          set({ isAuthenticated: true })
          get().fetchProfile()
        }
      },
      
      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          // 1. Login lấy token
          const response = await authAPI.login(data)
          const { accessToken, refreshToken } = response.data
          
          if (!accessToken) {
            throw new Error('Không nhận được access token')
          }
          
          // 2. Lưu token TRƯỚC
          localStorage.setItem('accessToken', accessToken)
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken)
          }
          
          console.log('✅ Token saved:', accessToken.slice(0, 30) + '...')
          
          // 3. Set isAuthenticated = true (có token là authenticated)
          set({ isAuthenticated: true, isLoading: false, error: null })
          
          // 4. Fetch profile (sẽ dùng token vừa lưu)
          try {
            const profileData = await authAPI.getProfile()
            
            const userProfile: UserProfile = {
              id: profileData.id,
              email: profileData.email,
              name: profileData.name || profileData.fullName || 'User',
              role: profileData.role,
              phone: profileData.phone,
              avatar: profileData.avatar,
              createdAt: profileData.createdAt || new Date().toISOString(),
            }
            
            set({ user: userProfile })
            console.log('✅ Profile loaded:', userProfile)
          } catch (profileError: any) {
            console.error('❌ Failed to fetch profile:', profileError.response?.status, profileError.response?.data)
            // Vẫn authenticated nhưng chưa có user
          }
          
          return true
        } catch (error: any) {
          console.error('❌ Login error:', error)
          const message = error.response?.data?.message || error.message || 'Đăng nhập thất bại'
          set({ isLoading: false, error: message, isAuthenticated: false })
          return false
        }
      },
      
      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authAPI.register(data)
          const { accessToken, refreshToken } = response.data
          
          localStorage.setItem('accessToken', accessToken)
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken)
          }
          
          set({ isAuthenticated: true, isLoading: false, error: null })
          
          // Fetch profile sau khi register
          try {
            const profileData = await authAPI.getProfile()
            
            const userProfile: UserProfile = {
              id: profileData.id,
              email: profileData.email,
              name: profileData.name || profileData.fullName || 'User',
              role: profileData.role,
              phone: profileData.phone,
              avatar: profileData.avatar,
              createdAt: profileData.createdAt || new Date().toISOString(),
            }
            
            set({ user: userProfile })
          } catch {
            // Không set user nhưng vẫn authenticated
          }
          
          return true
        } catch (error: any) {
          const message = error.response?.data?.message || 'Đăng ký thất bại'
          set({ isLoading: false, error: message, isAuthenticated: false })
          return false
        }
      },
      
      logout: async () => {
        try {
          await authAPI.logout()
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('auth-storage')
          set({ user: null, isAuthenticated: false, isLoading: false, error: null })
        }
      },
      
      fetchProfile: async () => {
        const token = localStorage.getItem('accessToken')
        if (!token) {
          set({ isAuthenticated: false, user: null })
          return
        }
        
        try {
          const profileData = await authAPI.getProfile()
          
          const userProfile: UserProfile = {
            id: profileData.id,
            email: profileData.email,
            name: profileData.name || profileData.fullName || 'User',
            role: profileData.role,
            phone: profileData.phone,
            avatar: profileData.avatar,
            createdAt: profileData.createdAt,
          }
          
          set({ 
            user: userProfile, 
            isAuthenticated: true,
            isLoading: false 
          })
          
          console.log('✅ Profile fetched:', userProfile)
        } catch (error) {
          console.error('❌ Failed to fetch profile:', error)
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },
      
      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)