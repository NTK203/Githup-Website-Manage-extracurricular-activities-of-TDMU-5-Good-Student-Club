'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'OFFICER' | 'ADMIN';
  phone?: string;
  class?: string;
  faculty?: string;
  avatarUrl?: string;
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

  // Load auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
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

        // Redirect based on role
        switch (data.user.role) {
          case 'ADMIN':
            router.push('/admin/dashboard');
            break;
          case 'OFFICER':
            router.push('/officer/dashboard');
            break;
          case 'STUDENT':
            router.push('/student/dashboard');
            break;
          default:
            router.push('/');
        }

        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Đăng nhập thất bại' };
      }
    } catch (error) {
      console.error('Login error:', error);
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
    router.push('/login');
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

  const hasRole = (requiredRole: 'STUDENT' | 'OFFICER' | 'ADMIN'): boolean => {
    if (!authState.user) return false;
    
    const roleHierarchy = {
      'STUDENT': 1,
      'OFFICER': 2,
      'ADMIN': 3
    };
    
    return roleHierarchy[authState.user.role] >= roleHierarchy[requiredRole];
  };

  const isAdmin = (): boolean => hasRole('ADMIN');
  const isOfficerOrAdmin = (): boolean => hasRole('OFFICER');

  return {
    ...authState,
    login,
    logout,
    updateUser,
    hasRole,
    isAdmin,
    isOfficerOrAdmin
  };
}
