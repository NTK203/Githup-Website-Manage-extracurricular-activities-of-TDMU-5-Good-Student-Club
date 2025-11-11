export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
        {/* Background with animated gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-slate-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%239C92AC&quot; fill-opacity=&quot;0.05&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;2&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>

        {/* Main content */}
        <div className="relative z-10 min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto animate-fadeIn">
            {/* Logo with enhanced styling */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <img 
                  src="/logo_clb_sv_5T.jpg" 
                  alt="CLB Sinh viên 5 Tốt TDMU" 
                  className="relative w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl shadow-2xl border-4 border-white/20 hover-scale transition-transform duration-300"
                />
              </div>
            </div>

            {/* Main heading with gradient text */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 gradient-text">
              CLB Sinh viên 5 Tốt TDMU
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 mb-8 font-medium">
              Hệ thống Quản lý Hoạt động Ngoại khóa
            </p>

            {/* Description */}
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Nền tảng quản lý hiện đại cho câu lạc bộ sinh viên, kết nối và phát triển cộng đồng học tập tích cực
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-16">
              <a 
                href="/admin/dashboard" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 btn-modern"
              >
                <span className="relative z-10 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Dashboard Admin
                </span>
              </a>
              
              <a 
                href="/auth/login" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 btn-modern"
              >
                <span className="relative z-10 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Đăng nhập
                </span>
              </a>
            </div>
          </div>

          {/* Features Section */}
          <div className="w-full max-w-6xl mx-auto animate-slideUp">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Feature Card 1 */}
              <div className="card-modern p-6 lg:p-8 text-center group hover-lift">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Quản lý Thành viên</h3>
                <p className="text-gray-600 dark:text-gray-400">Hệ thống quản lý thành viên hiện đại với phân quyền chi tiết và theo dõi hoạt động</p>
              </div>

              {/* Feature Card 2 */}
              <div className="card-modern p-6 lg:p-8 text-center group hover-lift">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Hoạt động Ngoại khóa</h3>
                <p className="text-gray-600 dark:text-gray-400">Tổ chức và quản lý các hoạt động ngoại khóa một cách hiệu quả và minh bạch</p>
              </div>

              {/* Feature Card 3 */}
              <div className="card-modern p-6 lg:p-8 text-center group hover-lift">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Báo cáo & Thống kê</h3>
                <p className="text-gray-600 dark:text-gray-400">Báo cáo chi tiết và thống kê trực quan giúp đưa ra quyết định chính xác</p>
              </div>
            </div>
          </div>

          {/* Footer section */}
          <div className="mt-16 text-center animate-fadeIn">
            <div className="glass-strong rounded-2xl p-8 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-4 gradient-text">Chào mừng đến với hệ thống</h2>
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                Hệ thống quản lý hoạt động ngoại khóa của CLB Sinh viên 5 Tốt TDMU được thiết kế với giao diện hiện đại, 
                dễ sử dụng và đầy đủ tính năng. Vui lòng đăng nhập để truy cập các chức năng quản lý.
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
