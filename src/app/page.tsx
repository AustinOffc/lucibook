"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? (user.role === "OWNER" ? "/owner" : "/dashboard") : "/login");
  }, [user, loading, router]);

  return <FullScreenSpinner />;
}
