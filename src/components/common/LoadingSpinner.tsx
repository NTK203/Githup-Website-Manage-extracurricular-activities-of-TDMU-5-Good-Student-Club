'use client';

import { Loader2, MapPin, Search } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  text,
  className = '' 
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 16,
    md: 32,
    lg: 48,
    xl: 64
  };

  const colorClasses = {
    primary: 'text-indigo-600',
    secondary: 'text-purple-600',
    white: 'text-white'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 
        size={sizeMap[size]} 
        className={`animate-spin ${colorClasses[color]}`}
      />
      
      {text && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// Alternative loading component with dots
export function LoadingDots({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}: Omit<LoadingSpinnerProps, 'text'>) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  };

  const colorClasses = {
    primary: 'bg-indigo-600',
    secondary: 'bg-purple-600',
    white: 'bg-white'
  };

  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}

// Skeleton loading component
export function LoadingSkeleton({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          style={{ 
            width: `${Math.random() * 40 + 60}%`,
            animationDelay: `${index * 100}ms`
          }}
        ></div>
      ))}
    </div>
  );
}

// Card skeleton loading
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6 animate-pulse"></div>
      </div>
    </div>
  );
}

// Loading component for time slot validation
export function TimeSlotValidationLoading({ 
  className = '' 
}: { 
  className?: string; 
}) {
  return (
    <div className={`flex items-center justify-center space-x-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 ${className}`}>
      <Loader2 size={20} className="text-yellow-500 animate-spin" />
      <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
        Đang kiểm tra buổi...
      </div>
    </div>
  );
}

// Loading component for location selection
export function LocationSelectionLoading({ 
  className = '' 
}: { 
  className?: string; 
}) {
  return (
    <div className={`flex items-center justify-center space-x-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 ${className}`}>
      <Loader2 size={20} className="text-blue-500 animate-spin" />
      <MapPin size={16} className="text-blue-600 dark:text-blue-400" />
      <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
        Đang xử lý địa điểm...
      </div>
    </div>
  );
}

// Loading component for search
export function SearchLoading({ 
  className = '' 
}: { 
  className?: string; 
}) {
  return (
    <div className={`flex items-center justify-center space-x-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 ${className}`}>
      <Loader2 size={20} className="text-green-500 animate-spin" />
      <Search size={16} className="text-green-600 dark:text-green-400" />
      <div className="text-sm font-medium text-green-700 dark:text-green-300">
        Đang tìm kiếm...
      </div>
    </div>
  );
}
