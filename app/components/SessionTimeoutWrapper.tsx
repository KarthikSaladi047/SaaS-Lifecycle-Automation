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
      signOut(); // auto logout
    }, 30 * 60 * 1000); // 30 mins

    return () => clearTimeout(timeout);
  }, []);

  return <>{children}</>;
}
