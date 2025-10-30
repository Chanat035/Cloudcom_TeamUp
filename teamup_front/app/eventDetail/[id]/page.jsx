// eventDetail/[id]/

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  FileText,
  Tag,
} from "lucide-react";
import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";
import Header from "@/app/component/header.jsx";


const EventDetail = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [activityImageUrl, setActivityImageUrl] = useState(null);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/status`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!data.isAuthenticated) {
        window.location.href = `${API_URL}/login`;
        return;
      }
      setUserInfo(data.userInfo);
    } catch (error) {
      console.error("Auth check failed:", error);
      window.location.href = `${API_URL}/login`;
    }
  };

  const fetchEvent = async () => {
    try {
      const res = await fetch(`${API_URL}/api/eventDetail/${id}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch event");
      const data = await res.json();
      setEventData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityImage = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/getActivityImage/${id}`
      );
      const data = await res.json();
      setActivityImageUrl(data.imageUrl);
    } catch (err) {
      console.error("Failed to fetch activity image:", err);
    }
  };

  const checkJoined = async () => {
    if (!id || !userInfo) return;
    try {
      const res = await fetch(
        `${API_URL}/api/eventDetail/${id}/checkParticipant`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = await res.json();
      setHasJoined(data.joined);
    } catch (err) {
      console.error("Check joined failed:", err);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (id) {
      fetchEvent();
      fetchActivityImage();
    }
  }, [id]);

  useEffect(() => {
    if (id && userInfo) {
      checkJoined();
    }
  }, [id, userInfo]);

  const handleJoin = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/eventDetail/${id}/join`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert("เข้าร่วมกิจกรรมสำเร็จ!");
        setHasJoined(true);
      } else {
        alert(data.error || "ไม่สามารถเข้าร่วมได้");
      }
    } catch (err) {
      console.error("Join failed:", err);
      alert("เกิดข้อผิดพลาด");
    }
  };

  // เพิ่มฟังก์ชันใหม่สำหรับออกจากกิจกรรม
  const handleCancelParticipation = async () => {
    const confirmed = window.confirm(
      "คุณแน่ใจหรือไม่ว่าต้องการออกจากกิจกรรมนี้?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API_URL}/api/eventDetail/${id}/cancel`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await res.json();
      if (res.ok) {
        alert("คุณได้ออกจากกิจกรรมแล้ว");
        setHasJoined(false);
      } else {
        alert(data.error || "ไม่สามารถออกจากกิจกรรมได้");
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      alert("เกิดข้อผิดพลาด");
    }
  };

  const isSignUpClosed = () => {
    if (!eventData?.signupdeadline) return false;
    const deadline = new Date(eventData.signupdeadline);
    const now = new Date();
    return now > deadline;
  };

  const goBack = () => {
    router.push("/eventSchedule");
  };

  function parseBangkok(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return new Date(d.getTime() - 7 * 60 * 60 * 1000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">ไม่พบข้อมูลกิจกรรม</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Header user={user} profileImage={profileImage} onLogout={handleLogout} />

      {/* ✅ Container รูปภาพกิจกรรม: ขนาด 520x520 พิกเซล พร้อมปรับรูปให้พอดี */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        {activityImageUrl && (
          <div className="w-full h-[520px] overflow-hidden rounded-xl shadow-lg mx-auto bg-gray-800">
            <img
              src={activityImageUrl}
              alt={eventData.name}
              className="w-full h-full object-contain object-center"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 p-6">
            <h2 className="text-4xl font-bold text-black mb-2">
              {eventData.name}
            </h2>
            <div className="flex items-center text-black text-lg">
              <Tag className="w-5 h-5 mr-2" />
              <span>{eventData.category || "กิจกรรม"}</span>
            </div>
          </div>

          <div className="p-6 grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  วันที่
                </h3>
                <div className="space-y-10 text-lg">
                  <div className="flex items-center text-gray-300">
                    เริ่มต้น :{" "}
                    {parseBangkok(eventData.startdate)?.toLocaleString(
                      "th-TH",
                      {
                        dateStyle: "long",
                        timeStyle: "short",
                      }
                    )}
                  </div>
                  <div className="flex items-center text-gray-300">
                    สิ้นสุด :{" "}
                    {parseBangkok(eventData.enddate)?.toLocaleString(
                      "th-TH",
                      {
                        dateStyle: "long",
                        timeStyle: "short",
                      }
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  สถานที่
                </h3>
                <p className="text-gray-300 text-lg">{eventData.location}</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                รายละเอียด
              </h3>
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {eventData.description || "ไม่มีรายละเอียดเพิ่มเติม"}
              </div>
            </div>
          </div>

          <div className="p-6 flex justify-end">
            {userInfo?.sub === eventData.owner ? (
              // Organizer
              <button
                onClick={() => router.push(`/editActivity/${id}`)}
                className="px-6 py-3 rounded-lg shadow font-bold bg-blue-500 text-white hover:bg-blue-400 transition-colors"
              >
                แก้ไขกิจกรรม
              </button>
            ) : hasJoined ? (
              // ถ้าเข้าร่วมแล้ว → โชว์ปุ่มออกจากกิจกรรม
              <button
                onClick={handleCancelParticipation}
                className="px-6 py-3 rounded-lg shadow font-bold bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                ออกจากกิจกรรม
              </button>
            ) : (
              // ยังไม่เข้าร่วม → โชว์ปุ่มเข้าร่วม
              <button
                onClick={handleJoin}
                disabled={isSignUpClosed()}
                className={`px-6 py-3 rounded-lg shadow font-bold transition-colors ${
                  isSignUpClosed()
                    ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                    : "bg-yellow-500 text-black hover:bg-yellow-400"
                }`}
              >
                {isSignUpClosed() ? "หมดเขตรับสมัครแล้ว" : "เข้าร่วมกิจกรรม"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
