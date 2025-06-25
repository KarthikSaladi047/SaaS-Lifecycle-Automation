"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

export default function SignIn() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-yellow-600 to-black flex items-center justify-center px-6">
        <div className="flex flex-col items-center space-y-6">
          <Image src="/logo.svg" alt="Logo" width={300} height={20} />
          <div className="bg-black bg-opacity-80 backdrop-blur-xl rounded-xl shadow-2xl p-14 w-[500px] text-center border border-yellow-500">
            <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-sm">
              PCD Manager
            </h1>
            <p className="text-yellow-300 mb-8 text-sm">
              Welcome! Sign in with your Google account.
            </p>

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
    </>
  );
}
