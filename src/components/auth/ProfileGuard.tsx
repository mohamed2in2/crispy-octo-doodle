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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    void fetchMeWithRetry(8, 250).then((me) => {
      if (cancelled) {
        return;
      }
      if (me && !me.profileCompleted) {
        router.replace("/complete-profile");
        return;
      }
      setSignedInReady(true);
    });

    return () => {
      cancelled = true;
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

  return <>{children}</>;
}
