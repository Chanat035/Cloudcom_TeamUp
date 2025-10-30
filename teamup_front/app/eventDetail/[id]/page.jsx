"use client";

import React, { useEffect, useState } from "react";
import MainLayout from "@/app/component/MainLayout.jsx";
import { API_URL } from "@/lib/config";
import { MapPin, Clock, User, ArrowLeft } from "lucide-react";

function parseBangkok(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return new Date(d.getTime() - 7 * 60 * 60 * 1000);
}

export default function EventDetailPage() {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  // try to get id from URL: expects path like /eventDetail/{id}
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const path = window.location.pathname || "";
        const parts = path.split("/").filter(Boolean);
        // find last segment as id (safe heuristic)
        const id = parts[parts.length - 1];
        if (!id) {
          setError("ไม่พบรหัสกิจกรรมใน URL");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/eventDetail/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("fetch_failed");
        const data = await res.json();
        // normalize fields
        setEventData({
          id: data.id || id,
          name: data.name || data.title || "ชื่อกิจกรรม",
          date: data.startdate || data.date || "",
          enddate: data.enddate || "",
          time: data.time || "",
          location: data.location || data.venue || "ไม่ระบุสถานที่",
          image: data.image || data.photo || "",
          description: data.description || data.detail || "ไม่มีคำอธิบาย",
          organizer: data.organizer || data.user_name || data.created_by || "ไม่ระบุ",
          signupdeadline: data.signupdeadline || data.deadline || null,
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม");
        setLoading(false);
      }
    };

    fetchEvent();
  }, []);

  const handleJoin = async () => {
    if (!eventData) return;
    setJoining(true);
    try {
      const res = await fetch(`${API_URL}/api/event/${eventData.id}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "join_failed");
      }
      // feedback simple
      alert("เข้าร่วมกิจกรรมเรียบร้อยแล้ว");
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเข้าร่วมได้: " + (err.message || ""));
    } finally {
      setJoining(false);
    }
  };

  if (loading)
    return (
      <MainLayout>
        <div className="p-6 text-gray-700">กำลังโหลดข้อมูลกิจกรรม...</div>
      </MainLayout>
    );

  if (error)
    return (
      <MainLayout>
        <div className="p-6 text-red-600">{error}</div>
      </MainLayout>
    );

  const start = parseBangkok(eventData.date);
  const end = parseBangkok(eventData.enddate);
  const dateStr = start
    ? start.toLocaleString("th-TH", { dateStyle: "long" })
    : "ไม่ระบุวันที่";

  return (
    <MainLayout>
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
          </button>

          <div className="bg-white/80 rounded-xl shadow-lg overflow-hidden">
            {/* Hero */}
            <div className="bg-gradient-to-r from-pink-500 to-pink-400 p-6">
              <h1 className="text-3xl font-bold text-white">{eventData.name}</h1>
              <p className="text-sm text-pink-100 mt-1">
                {dateStr} {start ? ` · ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}{" "}
                {eventData.location ? `· ${eventData.location}` : ""}
              </p>
            </div>

            <div className="p-6 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="w-full h-64 rounded-lg overflow-hidden bg-white/60 border border-gray-100">
                  {eventData.image ? (
                    // use img with object-cover so it looks good
                    <img src={eventData.image} alt={eventData.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">ไม่มีรูปภาพ</div>
                  )}
                </div>

                <div className="rounded-lg p-4 bg-white/70 border border-gray-100 text-gray-900">
                  <h3 className="font-semibold mb-2">รายละเอียด</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{eventData.description}</p>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-lg p-4 bg-white/70 border border-gray-100 text-gray-900">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> วันที่ & เวลา</h4>
                  <div className="text-sm">
                    <div>{dateStr}</div>
                    {start && (
                      <div>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {end ? `- ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg p-4 bg-white/70 border border-gray-100 text-gray-900">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> สถานที่</h4>
                  <div className="text-sm">{eventData.location}</div>
                </div>

                <div className="rounded-lg p-4 bg-white/70 border border-gray-100 text-gray-900">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><User className="w-4 h-4" /> ผู้จัด</h4>
                  <div className="text-sm">{eventData.organizer}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="flex-1 px-4 py-2 rounded shadow-sm bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60"
                  >
                    {joining ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
                  </button>
                  <button
                    onClick={() => navigator.share ? navigator.share({ title: eventData.name, url: window.location.href }) : alert("ระบบแชร์ไม่รองรับ")}
                    className="px-4 py-2 rounded shadow-sm bg-white border border-gray-200 text-gray-900"
                  >
                    แชร์
                  </button>
                </div>

                {eventData.signupdeadline && (
                  <div className="text-sm text-gray-600 mt-2">
                    ลงทะเบียนได้ถึง:{" "}
                    {parseBangkok(eventData.signupdeadline).toLocaleString("th-TH", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
