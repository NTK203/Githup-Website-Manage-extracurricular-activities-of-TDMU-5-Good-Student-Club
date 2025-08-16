'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

export default function AvatarUploadTest() {
  const { user, updateUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Vui lòng chọn file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      const data = await response.json();

             if (response.ok) {
         setResult(data);
         
         // Update user data with new avatar URL
         if (user) {
           updateUser({ ...user, avatarUrl: data.url });
           
           // Emit event to notify AdminNav about avatar change
           window.dispatchEvent(new CustomEvent('avatarUploaded', { 
             detail: { avatarUrl: data.url } 
           }));
         }

         // Check if avatar URL was saved to database
         setTimeout(async () => {
           try {
             const checkResponse = await fetch('/api/users/check', {
               headers: {
                 'Authorization': `Bearer ${localStorage.getItem('token')}`
               }
             });
             
             if (checkResponse.ok) {
               const checkData = await checkResponse.json();
               console.log('User data from database:', checkData.user);
               if (checkData.user.avatarUrl === data.url) {
                 console.log('✅ Avatar URL successfully saved to database!');
               } else {
                 console.log('❌ Avatar URL not saved to database');
               }
             }
           } catch (error) {
             console.error('Error checking database:', error);
           }
         }, 1000);
       } else {
         setError(data.error || 'Upload failed');
       }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Test Avatar Upload</h3>
      
      {/* Current Avatar Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Avatar hiện tại:</h4>
        <div className="flex items-center space-x-4">
          {user?.avatarUrl ? (
            <div className="relative">
              <Image
                src={user.avatarUrl}
                alt="Current Avatar"
                width={80}
                height={80}
                className="rounded-full border-2 border-blue-500"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center border-2 border-blue-500">
              <span className="text-white text-xl font-bold">
                {getInitials(user?.name || 'User')}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">
              <strong>User:</strong> {user?.name || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Avatar URL:</strong> {user?.avatarUrl || 'Chưa có avatar'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chọn file ảnh
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="text-sm text-gray-600">
            File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang upload...' : 'Upload Avatar'}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm font-medium">Upload thành công!</p>
            <p className="text-green-600 text-sm">URL: {result.url}</p>
            <p className="text-green-600 text-sm">Public ID: {result.public_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
