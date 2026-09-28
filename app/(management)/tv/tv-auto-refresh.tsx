"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function TvAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    // Re-render the page, but the database lease still limits YouTube API calls to once per hour.
    const timer = window.setInterval(() => router.refresh(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
