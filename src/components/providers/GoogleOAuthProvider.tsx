'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  // Always wrap with GoogleOAuthProvider to ensure useGoogleLogin hook works
  // Use a dummy client ID if not configured - the button will check and show appropriate message
  const clientId = GOOGLE_CLIENT_ID || 'dummy-client-id-for-hook-initialization';
  
  // Only warn in development mode
  if (!GOOGLE_CLIENT_ID && process.env.NODE_ENV === 'development') {
    // Silent in production, Google Sign-In buttons will be disabled automatically
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}

