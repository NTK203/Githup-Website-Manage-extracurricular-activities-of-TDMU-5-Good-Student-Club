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
          logout();
        }
      } else if (response.status === 401) {
        console.warn('Token expired or invalid during refetch, logging out.');
        logout();
      } else {
        console.error('Error refetching user data:', response.statusText);
      }
    } catch (error) {
      console.error('Network error refetching user data:', error);
      logout(); // Logout on network errors to prevent stale data
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
        
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
        
        // IMPORTANT: Refetch user data from backend to ensure it's up-to-date
        refetchUser();

      } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
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

      const data = await response.json();

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
        return { success: false, error: data.error || 'Đăng nhập thất bại' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const loginGoogle = async (access_token: string) => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token }),
      });

      const data = await response.json();

      if (data.success && data.user && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setAuthState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false
        });

        const redirectUrl = data.redirectUrl || '/student/dashboard';
        router.push(redirectUrl);

        return { success: true, user: data.user, isNewUser: data.isNewUser };
      } else {
        return { success: false, error: data.error || 'Đăng nhập Google thất bại' };
      }
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });

    // Call logout API (optional)
    fetch('/api/auth/logout', { method: 'POST' }).catch(console.error);
    
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
