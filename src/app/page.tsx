import ClientOnly from '@/components/common/ClientOnly';

export default function Home() {
  return (
    <ClientOnly>
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4 sm:mb-6">
            <img 
              src="/logo_clb_sv_5T.jpg" 
              alt="CLB Sinh viên 5 Tốt TDMU" 
              className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl shadow-lg"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Website Quản lý Hoạt động Ngoại khóa
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-3 sm:mb-4">
            CLB Sinh viên 5 Tốt TDMU
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <a 
              href="/admin/dashboard" 
              className="inline-block bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              🏠 Dashboard Admin
            </a>
            <a 
              href="/auth/login" 
              className="inline-block bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              🔐 Đăng nhập
            </a>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Chào mừng đến với hệ thống</h2>
            <p className="text-gray-600">
              Hệ thống quản lý hoạt động ngoại khóa của CLB Sinh viên 5 Tốt TDMU. 
              Vui lòng đăng nhập để truy cập các chức năng quản lý.
            </p>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
