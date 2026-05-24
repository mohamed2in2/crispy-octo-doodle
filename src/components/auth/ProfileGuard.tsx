"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMeWithRetry } from "@/lib/fetch-me";

interface ProfileGuardProps {
  children: React.ReactNode;
}

export function ProfileGuard({ children }: ProfileGuardProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkProfile = async () => {
      const me = await fetchMeWithRetry(6, 200);

      if (cancelled) return;

      if (!me) {
        setReady(true);
        return;
      }

      if (!me.profileCompleted) {
        router.replace("/complete-profile");
        return;
      }

      setReady(true);
    };

    void checkProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
