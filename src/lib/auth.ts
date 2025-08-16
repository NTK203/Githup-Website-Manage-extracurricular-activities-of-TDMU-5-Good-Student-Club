import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface JWTPayload {
  userId: string;
  studentId: string;
  email: string;
  role: 'STUDENT' | 'OFFICER' | 'ADMIN';
  iat: number;
  exp: number;
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return null;
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Get token from request headers
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Check if user is authenticated
export function isAuthenticated(request: NextRequest): boolean {
  const token = getTokenFromRequest(request);
  if (!token) return false;
  
  const payload = verifyToken(token);
  return payload !== null;
}

// Get user from request
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  
  return verifyToken(token);
}

// Check if user has required role
export function hasRole(user: JWTPayload | null, requiredRole: 'STUDENT' | 'OFFICER' | 'ADMIN'): boolean {
  if (!user) return false;
  
  const roleHierarchy = {
    'STUDENT': 1,
    'OFFICER': 2,
    'ADMIN': 3
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Check if user is admin
export function isAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, 'ADMIN');
}

// Check if user is officer or admin
export function isOfficerOrAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, 'OFFICER');
}

// Create middleware for protected routes
export function requireAuth(requiredRole?: 'STUDENT' | 'OFFICER' | 'ADMIN') {
  return function(request: NextRequest) {
    const user = getUserFromRequest(request);
    
    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }
    
    if (requiredRole && !hasRole(user, requiredRole)) {
      return { error: 'Forbidden', status: 403 };
    }
    
    return { user };
  };
}
