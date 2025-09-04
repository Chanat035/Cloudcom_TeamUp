"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // ตรวจสอบสถานะ authentication เมื่อ component โหลด
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
        setUserInfo(data.userInfo);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      // ถ้า backend ไม่ได้รัน ให้แสดงข้อความแจ้งเตือน
      setIsAuthenticated(false);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = "http://localhost:3100/login";
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Cloudcom TeamUp
            </h1>
            <p className="text-gray-600">Amazon Cognito User Pool Demo</p>
          </div>

          {isAuthenticated ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  ยินดีต้อนรับ,{" "}
                  {userInfo?.username || userInfo?.email || "ผู้ใช้"}
                </h2>
                <p className="text-gray-600 mb-4">
                  นี่คือข้อมูลที่คุณสามารถใช้เป็น developer ได้:
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-64">
                  {JSON.stringify(userInfo, null, 2)}
                </pre>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                >
                  ออกจากระบบ
                </button>

                <button
                  onClick={() => router.push("/")}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                >
                  กลับหน้าหลัก
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="text-gray-600">
                <p className="mb-4">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-200"
              >
                เข้าสู่ระบบ
              </button>

              <button
                onClick={() => router.push("/")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >
                กลับหน้าหลัก
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
