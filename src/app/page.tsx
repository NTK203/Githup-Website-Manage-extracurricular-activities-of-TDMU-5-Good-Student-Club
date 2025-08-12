import ClientOnly from '@/components/ClientOnly';
import TestResults from '@/components/TestResults';

export default function Home() {
  return (
    <ClientOnly>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Chào mừng đến với dự án SV5TOT-TDMU
          </h1>
          <p className="text-lg text-gray-600">
            Kiểm tra kết nối các services
          </p>
        </div>
        
        <TestResults />
      </div>
    </ClientOnly>
  );
}
