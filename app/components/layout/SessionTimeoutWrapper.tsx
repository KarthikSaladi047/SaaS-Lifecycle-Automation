"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SessionTimeoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      signOut({ callbackUrl: "/auth" });
    }, 60 * 60 * 1000);

    return () => clearTimeout(timeout); // cleanup on unmount
  }, []);

  return <>{children}</>;
}
