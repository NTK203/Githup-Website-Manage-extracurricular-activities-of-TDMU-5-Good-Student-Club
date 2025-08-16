'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function DatabaseTest() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dbData, setDbData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkDatabase = async () => {
    setLoading(true);
    setError(null);
    setDbData(null);

    try {
      const response = await fetch('/api/users/check', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setDbData(data.user);
      } else {
        setError(data.error || 'Failed to get user data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Database Test</h3>
      
      <div className="space-y-4">
        <button
          onClick={checkDatabase}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang kiểm tra...' : 'Kiểm tra Database'}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {dbData && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h4 className="text-green-700 text-sm font-medium mb-2">User Data from Database:</h4>
            <div className="text-sm text-green-600 space-y-1">
              <p><strong>Name:</strong> {dbData.name}</p>
              <p><strong>Email:</strong> {dbData.email}</p>
              <p><strong>Role:</strong> {dbData.role}</p>
              <p><strong>Avatar URL:</strong> {dbData.avatarUrl || 'Chưa có avatar'}</p>
              <p><strong>Updated At:</strong> {new Date(dbData.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="text-gray-700 text-sm font-medium mb-2">Current User Data (LocalStorage):</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {user?.name || 'N/A'}</p>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
            <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
            <p><strong>Avatar URL:</strong> {user?.avatarUrl || 'Chưa có avatar'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
