'use client';

import dynamic from 'next/dynamic';

const CreateSingleActivityPage = dynamic(() => import('../page'), {
  ssr: false
});

export default function EditActivityPage() {
  return <CreateSingleActivityPage />;
}
