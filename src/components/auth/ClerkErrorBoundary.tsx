'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Clerk?: unknown;
  }
}

export function ClerkErrorBoundary({ children }: { children: React.ReactNode }) {
  const [clerkError, setClerkError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for Clerk errors
    const handleError = (event: Event) => {
      const errorEvent = event as unknown as ErrorEvent;
      if (errorEvent.message?.includes('clerk') || errorEvent.message?.includes('Clerk')) {
        console.error('Clerk Error:', errorEvent);
        setClerkError(errorEvent.message || 'Failed to load authentication');
      }
    };

    window.addEventListener('error', handleError);

    // Also check for Clerk loading timeout
    const timeout = setTimeout(() => {
      if (!window.Clerk && !clerkError) {
        console.warn('Clerk failed to load within timeout');
        setClerkError('Authentication service is taking too long to load. Please refresh the page.');
      }
    }, 10000);

    return () => {
      window.removeEventListener('error', handleError);
      clearTimeout(timeout);
    };
  }, []);

  if (clerkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              تعذر تحميل خدمة المصادقة
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              يرجى التحقق من الإنترنت والمحاولة مجددًا
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              إعادة تحميل
            </button>
            <details className="text-sm text-gray-500 dark:text-gray-400 text-left">
              <summary className="cursor-pointer hover:text-gray-700">تفاصيل الخطأ</summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                {clerkError}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
