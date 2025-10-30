// header.jsx
"use client";

import { useRouter } from "next/navigation";
import { Users, Plus, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/config"; //

export default function Header({
  user: propUser = null,
  profileImage: propProfileImage = null,
  onLogout: propOnLogout = null,
}) {
  const router = useRouter();
  const [hover, setHover] = useState(false);

  // internal state (ใช้เมื่อ parent ไม่ส่งค่าเข้ามา)
  const [user, setUser] = useState(propUser);
  const [profileImage, setProfileImage] = useState(propProfileImage);
  const [loadingAuth, setLoadingAuth] = useState(false);

  useEffect(() => {
    // ถ้า parent ส่ง user มาแล้ว ไม่ต้อง fetch
    if (propUser) return;

    let mounted = true;
    const fetchAuth = async () => {
      setLoadingAuth(true);
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: "include",
        });
        if (!res.ok) {
          if (mounted) {
            setUser(null);
            setProfileImage(null);
          }
          return;
        }
        const data = await res.json();
        if (mounted) {
          setUser(data.userInfo || null);
          const img =
            data.userInfo?.profileImage ||
            data.userInfo?.imageUrl ||
            data.userInfo?.avatarUrl ||
            null;
          setProfileImage(img);
        }
      } catch (err) {
        console.error("Header: fetch auth failed", err);
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    };

    fetchAuth();
    return () => {
      mounted = false;
    };
  }, [propUser]);

  // ถ้า parent ให้ onLogout มา ให้ใช้; ถ้าไม่ ให้สร้าง internal handler
  const handleLogout = propOnLogout
    ? propOnLogout
    : async () => {
        try {
          await fetch(`/api/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
        } catch (err) {
          console.error("Logout error:", err);
        } finally {
          window.location.href = "/login";
        }
      };

  // sync เมื่อ parent เปลี่ยน props
  useEffect(() => {
    if (propUser !== undefined && propUser !== null) setUser(propUser);
  }, [propUser]);

  useEffect(() => {
    if (propProfileImage !== undefined && propProfileImage !== null)
      setProfileImage(propProfileImage);
  }, [propProfileImage]);

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* --- Logo / Nav --- */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TeamUp
              </h1>
            </div>

            <nav className="hidden md:flex space-x-6 items-center">
              <a
                href="/home"
                className="text-gray-900 font-medium hover:text-blue-600 transition"
              >
                หน้าหลัก
              </a>
              <a
                href="/eventSchedule"
                className="text-gray-500 hover:text-gray-900 transition"
              >
                กิจกรรมทั้งหมด
              </a>

              <button
                onClick={() => router.push("/groupChat")}
                className="text-gray-500 hover:text-gray-900 transition"
                title="ไปยังแชทของฉัน"
              >
                แชทของฉัน
              </button>
            </nav>
          </div>

          {/* --- Actions --- */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/createActivity")}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">สร้างกิจกรรม</span>
            </button>

            <div className="flex items-center space-x-3 pl-4 border-l border-gray-300">
              {/* โปรไฟล์ */}
              <div
                onClick={() => router.push("/profile")}
                className="flex items-center gap-3 cursor-pointer"
                title="ไปยังโปรไฟล์"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user && typeof user === "object"
                      ? user.name || user.preferred_username || user.email
                      : "ผู้เยี่ยมชม"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user && user.email ? user.email : ""}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                  {profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileImage}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white font-semibold bg-gradient-to-r from-blue-600 to-purple-600 w-full h-full flex items-center justify-center">
                      {(user?.name || user?.email || "U")
                        .toString()
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Logout */}
              <div className="relative">
                <button
                  onMouseEnter={() => setHover(true)}
                  onMouseLeave={() => setHover(false)}
                  onClick={handleLogout}
                  className="ml-2 px-3 py-2 rounded-md text-red-600 border border-transparent hover:bg-red-50 transition"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
