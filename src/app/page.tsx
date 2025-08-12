import ClientOnly from '@/components/ClientOnly';
import TestResults from '@/components/TestResults';

export default function Home() {
  return (
    <ClientOnly>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Website Quản lý Hoạt động Ngoại khóa
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            CLB Sinh viên 5 Tốt TDMU
          </p>
          <div className="flex justify-center space-x-4 mb-8">
            <a 
              href="/dashboard" 
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🏠 Dashboard Admin
            </a>
            <a 
              href="/login" 
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              🔐 Đăng nhập
            </a>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Kiểm tra kết nối hệ thống</h2>
            <TestResults />
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
