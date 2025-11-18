import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface JWTPayload {
  userId: string;
  studentId: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT';
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
export function hasRole(user: JWTPayload | null, requiredRole: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT'): boolean {
  if (!user) return false;
  
  const roleHierarchy = {
    'STUDENT': 1,
    'CLUB_STUDENT': 2,
    'CLUB_MEMBER': 3,
    'CLUB_DEPUTY': 4,
    'CLUB_LEADER': 5,
    'ADMIN': 6,
    'SUPER_ADMIN': 7
  };
  
  const userRoleLevel = roleHierarchy[user.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
}

// Check if user is admin (Quản trị hệ thống)
// Admin: SUPER_ADMIN, ADMIN, hoặc CLUB_LEADER
export function isAdmin(user: JWTPayload | null): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CLUB_LEADER';
}

// Check if user is super admin (Siêu quản trị viên)
// Super Admin: SUPER_ADMIN only
export function isSuperAdmin(user: JWTPayload | null): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN';
}

// Check if user is officer (Cán bộ phụ trách câu lạc bộ)
// Officers: CLUB_DEPUTY, CLUB_MEMBER
// Note: CLUB_LEADER thuộc ADMIN nên không thuộc OFFICER
export function isOfficer(user: JWTPayload | null): boolean {
  if (!user) return false;
  return ['CLUB_DEPUTY', 'CLUB_MEMBER'].includes(user.role);
}

// Check if user is student (Thành viên câu lạc bộ và người tham gia)
// Students: CLUB_STUDENT, STUDENT
export function isStudent(user: JWTPayload | null): boolean {
  if (!user) return false;
  return user.role === 'CLUB_STUDENT' || user.role === 'STUDENT';
}

// Check if user is club leader or admin (legacy function for backward compatibility)
export function isClubLeaderOrAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, 'CLUB_LEADER') || isAdmin(user);
}

// Create middleware for protected routes
export function requireAuth(requiredRole?: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT') {
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
