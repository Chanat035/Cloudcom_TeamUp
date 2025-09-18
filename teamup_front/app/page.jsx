"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const router = useRouter();

  const cognitoDomain =
    "https://ap-southeast-2zbxn28ian.auth.ap-southeast-2.amazoncognito.com";
  const clientId = "2sqjfuh2t12b1djlpnbjq9beba";
  const redirectUri = "http://localhost:3100/callback";
  const responseType = "code";
  const scope = "phone+openid+email";

  const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}`;

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("http://localhost:3100/api/auth/status", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.isAuthenticated);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      router.push("/login");
    } else {
      window.location.href = loginUrl;
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:3100/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setIsAuthenticated(false);
        setUserInfo(null);
        router.push("/");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-700 mb-4">
          TeamUp
          </h1>
        </div>

        <div className="flex gap-6 items-center flex-col sm:flex-row">
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            เข้าสู่ระบบ
          </button>
                          <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                >
                  ออกจากระบบ
                </button>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-gray-600">
        <span>© 2025 Cloudcom TeamUp</span>
      </footer>
    </div>
  );
}
