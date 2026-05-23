"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { fetchMeWithRetry } from "@/lib/fetch-me";

interface ProfileGuardProps {
  children: React.ReactNode;
}

/**
 * Redirects signed-in users with incomplete profiles to /complete-profile.
 */
export function ProfileGuard({ children }: ProfileGuardProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [signedInReady, setSignedInReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;
    let timeout: NodeJS.Timeout;

    const checkProfile = async () => {
      try {
        const me = await fetchMeWithRetry(8, 250);
        
        if (cancelled) return;

        if (!me) {
          console.warn("Profile check failed - user data unavailable");
          setError("Failed to load profile. Please refresh.");
          setSignedInReady(true);
          return;
        }

        if (!me.profileCompleted) {
          router.replace("/complete-profile");
          return;
        }

        setSignedInReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error("Profile guard error:", err);
          setError("An error occurred. Please refresh.");
          setSignedInReady(true);
        }
      }
    };

    timeout = setTimeout(() => {
      if (!cancelled && !signedInReady) {
        console.warn("Profile check timeout");
        setError("Profile check timed out. Please refresh.");
        setSignedInReady(true);
      }
    }, 5000);

    void checkProfile();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <>{children}</>;
  }

  if (!signedInReady) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
