'use client';

import { useState } from 'react';

export default function TestResults() {
  const [mongoResult, setMongoResult] = useState<any>(null);
  const [cloudinaryResult, setCloudinaryResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testMongoDB = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/testdb');
      const result = await response.json();
      setMongoResult(result);
    } catch (error) {
      setMongoResult({ ok: false, error: 'Network error' });
    }
    setIsLoading(false);
  };

  const testCloudinary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/testcloudinary');
      const result = await response.json();
      setCloudinaryResult(result);
    } catch (error) {
      setCloudinaryResult({ ok: false, error: 'Network error' });
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Kiểm tra kết nối hệ thống</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MongoDB Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">MongoDB Connection Test</h3>
          <button
            onClick={testMongoDB}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            {isLoading ? 'Đang kiểm tra...' : 'Test MongoDB'}
          </button>
          
          {mongoResult && (
            <div className={`p-3 rounded-md ${
              mongoResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className="font-medium">
                {mongoResult.ok ? '✅ Success' : '❌ Error'}
              </div>
              <div className="text-sm mt-1">
                {mongoResult.message || mongoResult.error}
              </div>
            </div>
          )}
        </div>

        {/* Cloudinary Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cloudinary Connection Test</h3>
          <button
            onClick={testCloudinary}
            disabled={isLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 mb-4"
          >
            {isLoading ? 'Đang kiểm tra...' : 'Test Cloudinary'}
          </button>
          
          {cloudinaryResult && (
            <div className={`p-3 rounded-md ${
              cloudinaryResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className="font-medium">
                {cloudinaryResult.ok ? '✅ Success' : '❌ Error'}
              </div>
              <div className="text-sm mt-1">
                {cloudinaryResult.message || cloudinaryResult.error}
              </div>
              {cloudinaryResult.cloud_url && (
                <div className="text-xs mt-2 opacity-75">
                  Cloud URL: {cloudinaryResult.cloud_url}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
