'use client';

import dynamic from 'next/dynamic';

const CreateMultipleDaysActivityPage = dynamic(() => import('../page'), {
  ssr: false
});

export default function EditMultipleDaysActivityPage() {
  return <CreateMultipleDaysActivityPage />;
}

