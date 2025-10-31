"use client";

import { useRouter } from "next/navigation";
import { Users, Plus, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/config";

export default function Header({ user: propUser = null, profileImage: propProfileImage = null, onLogout: propOnLogout = null }) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [user, setUser] = useState(propUser);
  const [profileImage, setProfileImage] = useState(propProfileImage);
  const [loadingAuth, setLoadingAuth] = useState(false);

  useEffect(() => {
    if (propUser) return;
    let mounted = true;
    const fetchAuth = async () => {
      setLoadingAuth(true);
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, { credentials: "include" });
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

  const handleLogout = propOnLogout
    ? propOnLogout
    : async () => {
        try {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
        } catch (err) {
          console.error("Logout error:", err);
        } finally {
          window.location.href = "/";
        }
      };

  useEffect(() => {
    if (propUser !== undefined && propUser !== null) setUser(propUser);
  }, [propUser]);

  useEffect(() => {
    if (propProfileImage !== undefined && propProfileImage !== null)
      setProfileImage(propProfileImage);
  }, [propProfileImage]);

  useEffect(() => {
    if (!user) return;
    const fetchProfileImage = async () => {
      try {
        const res = await fetch(`${API_URL}/api/getProfile`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.imageUrl) setProfileImage(data.imageUrl);
      } catch (err) {
        console.error("Error loading profile image:", err);
      }
    };
    fetchProfileImage();
  }, [user]);

  return (
    <header className="header-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <div
              onClick={() => router.push("/home")}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#E35205] to-[#FF944D] rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#E35205] to-[#FF944D] bg-clip-text text-transparent tracking-tight">
                TeamUp
              </h1>
            </div>

            <nav className="hidden md:flex space-x-6 items-center font-medium text-[15px]">
              <a href="/home" className="nav-link-active">
                หน้าหลัก
              </a>
              <a href="/eventSchedule" className="nav-link">
                กิจกรรมทั้งหมด
              </a>
              <button onClick={() => router.push("/groupChat")} className="nav-link">
                แชทของฉัน
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/createActivity")}
              className="px-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-[#E35205] to-[#FF944D] hover:shadow-lg transform hover:scale-105 transition-all"
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>สร้างกิจกรรม</span>
              </div>
            </button>

            <div className="flex items-center space-x-3 pl-4 border-l border-gray-300">
              <div
                onClick={() => router.push("/profile")}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="text-right hidden sm:block leading-tight">
                  <div className="text-sm font-semibold text-gray-900">
                    {user && typeof user === "object"
                      ? user.name || user.preferred_username || user.email
                      : "ผู้เยี่ยมชม"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user && user.email ? user.email : ""}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#E35205] to-[#FF944D] flex items-center justify-center text-white font-semibold shadow-md">
                  {profileImage ? (
                    <img src={profileImage} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    (user?.name || user?.email || "U").toString().charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              <button
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={handleLogout}
                className={`ml-2 px-3 py-2 rounded-md transition-all ${
                  hover
                    ? "bg-red-50 text-red-600 scale-105 shadow-inner"
                    : "text-red-500 hover:bg-red-50"
                }`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&display=swap');
        html, body {
          font-family: 'IBM Plex Sans Thai Looped', sans-serif;
        }
        .header-blur {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          z-index: 50;
          animation: fadeInDown 0.6s ease;
        }
        .nav-link {
          color: #555;
          transition: color 0.25s ease;
        }
        .nav-link:hover {
          color: #E35205;
        }
        .nav-link-active {
          color: #E35205;
          font-weight: 600;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
