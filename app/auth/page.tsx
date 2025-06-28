"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

export default function SignIn() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-yellow-600 to-black flex items-center justify-center px-4 sm:px-6">
      <div className="flex flex-col items-center space-y-6 w-full max-w-md">
        <Image src="/logo.svg" alt="Logo" width={300} height={20} />
        <div className="bg-black bg-opacity-80 backdrop-blur-xl rounded-xl shadow-2xl p-8 sm:p-14 w-full text-center border border-yellow-500">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 drop-shadow-sm">
            PCD Manager
          </h1>
          <p className="text-yellow-300 mb-6 text-sm sm:text-base">
            Welcome! Sign in with your Google account.
          </p>

          {error && (
            <div className="text-red-500 mb-4 font-medium">
              {error === "AccessDenied"
                ? "Access denied: use your @platform9.com account."
                : "Something went wrong. Please try again."}
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => signIn("google", { callbackUrl: "/home" })}
              className="flex items-center justify-center gap-3 bg-white text-black px-6 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition-all duration-200 font-semibold cursor-pointer"
            >
              <Image
                src="/google-icon.svg"
                alt="Google"
                width={25}
                height={25}
              />
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
