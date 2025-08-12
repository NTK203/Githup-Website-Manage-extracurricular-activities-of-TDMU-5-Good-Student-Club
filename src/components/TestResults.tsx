'use client';

import { useState } from 'react';

interface TestResult {
  ok: boolean;
  message?: string;
  error?: string;
  details?: string | any;
  cloud_name?: string;
  api_key?: string;
  cloud_url?: string;
}

export default function TestResults() {
  const [mongoResult, setMongoResult] = useState<TestResult | null>(null);
  const [cloudinaryResult, setCloudinaryResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const testMongoDB = async () => {
    setLoading('mongo');
    try {
      const response = await fetch('/api/testdb');
      const result = await response.json();
      setMongoResult(result);
    } catch (error) {
      setMongoResult({ ok: false, error: 'Network error' });
    }
    setLoading(null);
  };

  const testCloudinary = async () => {
    setLoading('cloudinary');
    try {
      const response = await fetch('/api/testcloudinary');
      const result = await response.json();
      setCloudinaryResult(result);
    } catch (error) {
      setCloudinaryResult({ ok: false, error: 'Network error' });
    }
    setLoading(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MongoDB Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">MongoDB Connection</h3>
          <button
            onClick={testMongoDB}
            disabled={loading === 'mongo'}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            {loading === 'mongo' ? 'Testing...' : 'Test MongoDB'}
          </button>
          {mongoResult && (
            <div className={`p-3 rounded ${mongoResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <p className="font-medium">{mongoResult.ok ? '✅ Success' : '❌ Error'}</p>
              <p className="text-sm">{mongoResult.message || mongoResult.error}</p>
            </div>
          )}
        </div>

        {/* Cloudinary Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Cloudinary Connection</h3>
          <button
            onClick={testCloudinary}
            disabled={loading === 'cloudinary'}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 mb-4"
          >
            {loading === 'cloudinary' ? 'Testing...' : 'Test Cloudinary'}
          </button>
          {cloudinaryResult && (
            <div className={`p-3 rounded ${cloudinaryResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <p className="font-medium">{cloudinaryResult.ok ? '✅ Success' : '❌ Error'}</p>
              <p className="text-sm">{cloudinaryResult.message || cloudinaryResult.error}</p>
              {cloudinaryResult.cloud_url && (
                <p className="text-xs mt-1">URL: {cloudinaryResult.cloud_url}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
