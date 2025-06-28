import { Suspense } from "react";
import AuthClient from "./AuthClient";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <AuthClient />
    </Suspense>
  );
}
