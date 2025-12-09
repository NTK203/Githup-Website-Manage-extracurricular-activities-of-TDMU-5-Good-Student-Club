import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';

// Force dynamic rendering for this route - prevent static generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

// Prevent static generation by returning empty array
export function generateStaticParams() {
  return [];
}

// Dynamically import client component with no SSR
const AddMemberClient = dynamic(() => import('./AddMemberClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="animate-spin" size={32} />
    </div>
  ),
});

export default function AddMemberPage() {
  return <AddMemberClient />;
}
