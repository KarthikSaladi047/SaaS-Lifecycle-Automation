"use client";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { envList } from "@/app/constants/pcd";

interface NavBarProps {
  isControlPanel: boolean;
  selectedEnv?: string;
  onEnvChange?: (env: string) => void;
  loading?: boolean;
}

export default function NavBar({
  isControlPanel,
  selectedEnv,
  onEnvChange,
  loading = false,
}: NavBarProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {session && (
        <>
          {/* Main Navbar */}
          <nav className="bg-gray-900 text-white px-6 py-4 shadow-2xl ring-1 ring-gray-700 border-b border-gray-800 relative z-10">
            <div className="flex items-center justify-between">
              {/* Left: Logo */}
              <div>
                <Image src="/logo.svg" alt="Logo" width={200} height={10} />
              </div>

              {/* Center: Title */}
              <div className="absolute left-1/2 transform -translate-x-1/2 text-xl font-bold drop-shadow-md">
                PCD Manager
              </div>

              {/* Right: Control Button + Avatar */}
              <div
                className="flex items-center space-x-4 relative"
                ref={dropdownRef}
              >
                <button
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-1 px-4 rounded shadow-md transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  onClick={() =>
                    isControlPanel
                      ? router.back()
                      : router.push("/control-panel")
                  }
                >
                  {isControlPanel ? "Home Page" : "Control Panel"}
                </button>
                <Image
                  src={session.user?.image ?? "/avatar.jpg"}
                  alt="profile"
                  className="rounded-full border-2 border-yellow-500 cursor-pointer"
                  width={40}
                  height={40}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                />

                {dropdownOpen && (
                  <div className="absolute right-0 top-12 w-48 bg-white text-black rounded-lg shadow-lg z-50">
                    <div className="px-4 py-2 text-center text-sm font-medium border-b">
                      {session.user?.name}
                    </div>
                    <div className="px-4 py-2 text-xs text-center text-gray-600 border-b truncate">
                      {session.user?.email}
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-center px-4 py-2 text-sm hover:bg-red-500 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* Hanging Environment Buttons */}
          {!isControlPanel && (
            <div className="w-full flex justify-center">
              <div className="bg-gray-800 text-white px-6 py-2 mt-[-1px] shadow-lg rounded-b-xl backdrop-blur-sm bg-opacity-90 animate-slide-down flex space-x-6">
                {envList.map((env) => (
                  <button
                    key={env}
                    disabled={loading}
                    className={`relative transition duration-200 ease-in-out px-2 py-1 font-medium
                      ${loading ? "opacity-50 cursor-not-allowed" : ""}
                      after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full after:transition-all
                      ${
                        selectedEnv === env
                          ? "text-yellow-400 after:bg-yellow-400"
                          : "hover:text-green-300 after:bg-transparent hover:after:bg-green-300 cursor-pointer"
                      }`}
                    onClick={() => {
                      if (!loading) onEnvChange?.(env);
                    }}
                  >
                    {env.charAt(0).toUpperCase() + env.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
