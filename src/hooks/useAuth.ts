'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT' | 'OFFICER' | 'ADMIN';
  phone?: string;
  class?: string;
  faculty?: string;
  avatarUrl?: string;
  position?: string;
  department?: string;
  isClubMember?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Function to fetch and update user data from the backend
  const refetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/me', { // Assuming you have a /api/auth/me endpoint
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const updatedUser = { ...data.user };
          // Determine isClubMember based on role if not provided or incorrect
          if (['CLUB_STUDENT', 'CLUB_MEMBER', 'CLUB_LEADER', 'CLUB_DEPUTY'].includes(updatedUser.role)) {
            updatedUser.isClubMember = true;
          } else {
            updatedUser.isClubMember = false;
          }
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setAuthState(prev => ({
            ...prev,
            user: updatedUser,
            isAuthenticated: true,
          }));
          return updatedUser; // Return the updated user
        } else {
          console.error('Failed to refetch user data:', data.error);
          // Chỉ logout nếu chắc chắn token không hợp lệ (401)
          if (response.status === 401) {
            logout();
          }
        }
      } else if (response.status === 401) {
        console.warn('Token expired or invalid during refetch, logging out.');
        logout();
      } else {
        // Không logout khi có lỗi server (500, 503, etc.) - chỉ log
        console.error('Error refetching user data:', response.status, response.statusText);
        // Nếu không phải lỗi server, có thể token không hợp lệ
        if (response.status !== 500 && response.status !== 503 && response.status !== 502) {
          logout();
        }
      }
    } catch (error) {
      // Không logout khi có network error - có thể là tạm thời
      console.error('Network error refetching user data:', error);
      // Chỉ log, không logout để tránh redirect loop
    }
  };

  // Load auth state from localStorage on mount and refetch user data
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        
        // Check if token is expired by decoding it
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < currentTime) {
            console.log('Token expired, logging out');
            logout();
            return;
          }
        } catch (error) {
          console.error('Error decoding token:', error);
          logout();
          return;
        }
        
        // Chỉ set authenticated nếu có cả token và user hợp lệ
        if (user && user._id) {
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
          
          // IMPORTANT: Refetch user data from backend to ensure it's up-to-date
          // Delay refetch để không chậm quá trình load ban đầu
          // Chỉ refetch sau khi UI đã render xong
          setTimeout(() => {
            refetchUser();
          }, 1000); // 1 giây delay để trang load nhanh hơn
        } else {
          // User không hợp lệ, clear và set unauthenticated
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
        }

      } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
      }
    } else {
      // Không có token hoặc user, đảm bảo state là unauthenticated
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);
      
      // Check if response is ok
      if (!response.ok) {
        let errorData: any = {};
        let errorMessage = `Lỗi ${response.status}. Vui lòng thử lại.`;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const text = await response.text();
            if (text && text.trim()) {
              errorMessage = text;
            }
            errorData = { error: errorMessage };
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          // Determine error message based on status code
          switch (response.status) {
            case 400:
              errorMessage = 'Thông tin đăng nhập không hợp lệ.';
              break;
            case 401:
              errorMessage = 'Email hoặc mật khẩu không đúng.';
              break;
            case 404:
              errorMessage = 'Email này chưa được đăng ký.';
              break;
            case 500:
              errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
              break;
            default:
              errorMessage = `Lỗi ${response.status}. Vui lòng thử lại.`;
          }
          errorData = { error: errorMessage };
        }
        
        console.error('Login error response:', errorData);
        return { success: false, error: errorMessage };
      }

      // Parse successful response
      let data: any = {};
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.error('Unexpected response format:', text);
          return { success: false, error: 'Lỗi định dạng response từ server.' };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        return { success: false, error: 'Lỗi xử lý response từ server.' };
      }
      console.log('Login response data:', data);

      if (data.success && data.user && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setAuthState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false
        });

        // Use redirectUrl from API response or fallback to role-based routing
        const redirectUrl = data.redirectUrl || '/student/dashboard';
        router.push(redirectUrl);

        return { success: true, user: data.user };
      } else {
        console.error('Login failed - missing data:', { success: data.success, hasUser: !!data.user, hasToken: !!data.token });
        return { success: false, error: data.error || 'Đăng nhập thất bại' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', error.message, error.stack);
      return { success: false, error: error.message || 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const loginGoogle = async (access_token: string) => {
    try {
      console.log('Calling Google OAuth API...');
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token }),
      });

      console.log('Google OAuth response status:', response.status);
      
      const data = await response.json();
      console.log('Google OAuth response data:', data);

      if (data.success && data.user && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setAuthState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false
        });

        // Nếu user cần nhập password, không redirect ngay - để register page xử lý
        if ((data as any).needsPassword) {
          return { 
            success: true, 
            user: data.user, 
            isNewUser: data.isNewUser,
            needsPassword: true,
            token: data.token
          };
        }

        const redirectUrl = data.redirectUrl || '/student/dashboard';
        router.push(redirectUrl);

        return { success: true, user: data.user, isNewUser: data.isNewUser };
      } else {
        console.error('Google login failed:', data);
        return { success: false, error: data.error || 'Đăng nhập Google thất bại' };
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      console.error('Error details:', error.message, error.stack);
      return { success: false, error: error.message || 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const logout = () => {
    const token = localStorage.getItem('token');
    
    // Call logout API để xóa session trước khi xóa token
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(console.error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });
    
    // Redirect to login page
    router.push('/auth/login');
  };

  const checkTokenValidity = () => {
    const token = localStorage.getItem('token');
    console.log('🔍 checkTokenValidity: token exists?', !!token);
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      console.log('🔍 checkTokenValidity: payload.exp =', payload.exp, 'currentTime =', currentTime);
      console.log('🔍 checkTokenValidity: token valid?', payload.exp && payload.exp > currentTime);
      return payload.exp && payload.exp > currentTime;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setAuthState(prev => ({ ...prev, user: updatedUser }));
      
      // Emit custom event to notify other components about user data change
      window.dispatchEvent(new CustomEvent('userDataChanged', { detail: updatedUser }));
    }
  };

  const hasRole = (requiredRole: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT' | 'OFFICER' | 'ADMIN'): boolean => {
    if (!authState.user) return false;
    
    const roleHierarchy = {
      'CLUB_STUDENT': 1,
      'STUDENT': 1,
      'CLUB_MEMBER': 2,
      'CLUB_DEPUTY': 3,
      'CLUB_LEADER': 4,
      'SUPER_ADMIN': 5,
      'OFFICER': 2,
      'ADMIN': 5
    };
    
    const userRoleLevel = roleHierarchy[authState.user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  };

  const isAdmin = (): boolean => hasRole('ADMIN');
  const isOfficerOrAdmin = (): boolean => hasRole('CLUB_MEMBER');



  return {
    ...authState,
    login,
    loginGoogle,
    logout,
    updateUser,
    hasRole,
    isAdmin,
    isOfficerOrAdmin,
    checkTokenValidity,
    refetchUser
  };
}
