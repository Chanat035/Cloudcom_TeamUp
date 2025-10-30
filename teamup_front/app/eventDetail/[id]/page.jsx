"use client";

import React, { useEffect, useState } from "react";
import MainLayout from "@/app/component/MainLayout.jsx";
import { API_URL } from "@/lib/config";
import { MapPin, Clock, User, ArrowLeft, Edit2 } from "lucide-react";

function parseBangkok(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    // convert from UTC to Asia/Bangkok (UTC+7) if server stores UTC
    return new Date(d.getTime() - 7 * 60 * 60 * 1000);
  } catch {
    return null;
  }
}

export default function EventDetailPage() {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [ownerName, setOwnerName] = useState("ไม่ระบุ");
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);

  // Extract id from URL (last path segment)
  function extractIdFromPath() {
    try {
      const path = window.location.pathname || "";
      const parts = path.split("/").filter(Boolean);
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const id = extractIdFromPath();
    if (!id) {
      setError("ไม่พบรหัสกิจกรรมใน URL");
      setLoading(false);
      return;
    }

    if (!API_URL) {
      setError("ค่า API_URL ไม่ได้ตั้งค่า (ตรวจสอบ /lib/config)");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadAll = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) fetch event detail
        const res = await fetch(`${API_URL}/api/eventDetail/${id}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} - ${t}`);
        }
        const data = await res.json();

        const normalized = {
          id: data.id ?? id,
          name: data.name ?? data.title ?? "ชื่อกิจกรรม",
          date: data.startdate ?? data.date ?? data.start ?? "",
          enddate: data.enddate ?? data.end ?? "",
          time: data.time ?? "",
          location: data.location ?? data.venue ?? "ไม่ระบุสถานที่",
          imageField: data.image ?? data.photo ?? data.cover ?? "",
          description:
            data.description ?? data.detail ?? data.desc ?? "ไม่มีคำอธิบาย",
          owner: data.owner ?? data.user_id ?? data.owner_id ?? null,
          signupdeadline:
            data.signupdeadline ?? data.signUpDeadline ?? data.deadline ?? null,
        };

        setEventData(normalized);

        // 2) load activity image via backend endpoint (you implemented /api/getActivityImage/:id)
        try {
          const imgRes = await fetch(`${API_URL}/api/getActivityImage/${id}`);
          if (imgRes.ok) {
            const imgJson = await imgRes.json();
            setImageUrl(imgJson.imageUrl || null);
          } else {
            // fallback to any image field from event if provided
            setImageUrl(normalized.imageField || null);
          }
        } catch (err) {
          setImageUrl(normalized.imageField || null);
        }

        // 3) load owner display name (if owner id available)
        if (normalized.owner) {
          try {
            const uRes = await fetch(
              `${API_URL}/api/user/${encodeURIComponent(normalized.owner)}`
            );
            if (uRes.ok) {
              const uJson = await uRes.json();
              setOwnerName(uJson.name || "ไม่ระบุ");
            } else {
              setOwnerName("ไม่ระบุ");
            }
          } catch (err) {
            setOwnerName("ไม่ระบุ");
          }
        } else {
          setOwnerName("ไม่ระบุ");
        }

        // 4) check participant status (joined) — endpoint: /api/eventDetail/:id/checkParticipant
        try {
          const pRes = await fetch(
            `${API_URL}/api/eventDetail/${id}/checkParticipant`,
            {
              credentials: "include",
            }
          );
          if (pRes.ok) {
            const pJson = await pRes.json();
            setJoined(Boolean(pJson.joined));
          } else {
            setJoined(false);
          }
        } catch {
          setJoined(false);
        }

        // 5) check if current user is organizer:
        try {
          const participantsRes = await fetch(
            `${API_URL}/api/activity/${id}/participants`,
            {
              credentials: "include",
            }
          );
          if (participantsRes.ok) {
            const parts = await participantsRes.json();
            const meIsOrganizer = parts.some(
              (r) =>
                r.role === "organizer" &&
                (r.name === (r.name || "") &&
                r.user_id &&
                r.user_id === r.user_id
                  ? true
                  : false)
            );
            // Above is conservative (we can't access session id here). Instead derive organizer by matching owner id:
            const ownerId = normalized.owner;
            if (ownerId) {
              const foundOrganizerRecord = parts.find(
                (r) => r.role === "organizer" && r.user_id === ownerId
              );
              if (foundOrganizerRecord) {
                try {
                  const sRes = await fetch(`${API_URL}/api/auth/status`, {
                    credentials: "include",
                  });
                  if (sRes.ok) {
                    const sJson = await sRes.json();
                    const sessionSub = sJson.userInfo?.sub;
                    if (sessionSub && sessionSub === ownerId) {
                      setIsOrganizer(true);
                    } else {
                      setIsOrganizer(false);
                    }
                  }
                } catch {
                  setIsOrganizer(false);
                }
              } else {
                setIsOrganizer(false);
              }
            } else {
              setIsOrganizer(false);
            }
          } else {
            setIsOrganizer(false);
          }
        } catch (err) {
          // if participants endpoint fails, fallback to false
          setIsOrganizer(false);
        }
      } catch (err) {
        console.error("fetch event failed:", err);
        setError("ไม่สามารถดึงข้อมูลกิจกรรมได้: " + (err.message || ""));
      } finally {
        setLoading(false);
      }
    };

    loadAll();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = async () => {
    if (!eventData) return;
    setJoining(true);
    try {
      const res = await fetch(
        `${API_URL}/api/eventDetail/${eventData.id}/join`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} - ${t}`);
      }
      // success -> update joined state
      setJoined(true);
    } catch (err) {
      console.error("join error:", err);
      alert("ไม่สามารถเข้าร่วมได้: " + (err.message || ""));
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    if (!eventData) return;
    if (!confirm("ต้องการออกจากกิจกรรมใช่หรือไม่?")) return;
    try {
      const res = await fetch(
        `${API_URL}/api/eventDetail/${eventData.id}/cancel`,
        {
          method: "PUT",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} - ${t}`);
      }
      // reflect UI
      setJoined(false);
      alert("คุณได้ออกจากกิจกรรมแล้ว");
    } catch (err) {
      console.error("cancel error:", err);
      alert("ไม่สามารถออกกิจกรรมได้: " + (err.message || ""));
    }
  };

  const handleEdit = () => {
    if (!eventData) return;
    // redirect to editActivity page (frontend route)
    window.location.href = `/editActivity/${eventData.id}`;
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
        <div className="p-6 max-w-3xl mx-auto">
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
            <h4 className="font-semibold mb-2">เกิดข้อผิดพลาด</h4>
            <div>{error}</div>
          </div>
        </div>
      </MainLayout>
    );

  const start = parseBangkok(eventData.date);
  const end = parseBangkok(eventData.enddate);
  const dateStr = start
    ? start.toLocaleString("th-TH", { dateStyle: "long" })
    : "ไม่ระบุวันที่";

  // 24-hour time format: use hour12:false
  const startTime = start
    ? start.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";
  const endTime = end
    ? end.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  return (
    <MainLayout>
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
          </button>

          <div className="bg-white/80 rounded-xl shadow-lg overflow-hidden">
            {/* Hero */}
            <div className="bg-gradient-to-r from-pink-500 to-pink-400 p-6">
              <h1 className="text-3xl font-bold text-white">
                {eventData.name}
              </h1>
              <p className="text-sm text-pink-100 mt-1">
                {dateStr}
                {start ? ` · ${startTime}` : ""}
                {end ? ` - ${endTime}` : ""}
                {eventData.location ? ` · ${eventData.location}` : ""}
              </p>
            </div>

            <div className="p-6 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="w-full max-h-[400px] flex items-center justify-center bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                  {imageUrl ? (
                    // show imageUrl (from /api/getActivityImage or fallback)
                    // add onError fallback to avoid broken image
                    <img
                      src={imageUrl}
                      alt={eventData.name}
                      loading="lazy"
                      className="max-h-[400px] w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/default-activity.png";
                      }}
                    />
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center text-gray-400">
                      ไม่มีรูปภาพ
                    </div>
                  )}
                </div>

                <div className="rounded-lg p-4 bg-white/70 border border-gray-100 text-gray-900">
                  <h3 className="font-semibold mb-2">รายละเอียด</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {eventData.description}
                  </p>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-lg p-4 bg-white/70 border border-gray-100 text-gray-900">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> วันที่ & เวลา
                  </h4>
                  <div className="text-sm">
                    <div>{dateStr}</div>
                    {start && (
                      <div>
                        {startTime}
                        {end ? ` - ${endTime}` : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg p-4 bg-white/70 border border-gray-100 text-gray-900">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> สถานที่
                  </h4>
                  <div className="text-sm">{eventData.location}</div>
                </div>

                <div className="rounded-lg p-4 bg-white/70 border border-gray-100 text-gray-900">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> ผู้จัด
                  </h4>
                  <div className="text-sm">{ownerName || "ไม่ระบุ"}</div>
                </div>

                <div className="flex gap-2">
                  {isOrganizer ? (
                    // Organizer -> show Edit button
                    <button
                      onClick={handleEdit}
                      className="flex-1 px-4 py-2 rounded shadow-sm bg-white border border-gray-200 text-gray-900 flex items-center gap-2 hover:bg-gray-50"
                    >
                      <Edit2 className="w-4 h-4" /> แก้ไขรายละเอียด
                    </button>
                  ) : (
                    <>
                      {/* ตรวจว่าหมดเขตสมัครหรือยัง */}
                      {eventData.signupdeadline &&
                      new Date(eventData.signupdeadline) < new Date() ? (
                        // ❌ หมดเขตสมัครแล้ว
                        <button
                          disabled
                          className="flex-1 px-4 py-2 rounded shadow-sm bg-gray-200 text-gray-500 cursor-not-allowed"
                        >
                          ปิดรับสมัคร
                        </button>
                      ) : joined ? (
                        // ✅ ผู้ใช้เข้าร่วมแล้ว
                        <>
                          <button
                            disabled
                            className="flex-1 px-4 py-2 rounded shadow-sm bg-gray-200 text-gray-700"
                          >
                            เข้าร่วมแล้ว
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 rounded shadow-sm bg-white border border-gray-200 text-gray-900"
                          >
                            ออกจากกิจกรรม
                          </button>
                        </>
                      ) : (
                        // 🔘 ยังไม่เข้าร่วมและยังไม่หมดเขต
                        <button
                          onClick={handleJoin}
                          disabled={joining}
                          className="flex-1 px-4 py-2 rounded shadow-sm bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60"
                        >
                          {joining ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {eventData.signupdeadline && (
                  <div className="text-sm text-gray-600 mt-2">
                    ลงทะเบียนได้ถึง:{" "}
                    {parseBangkok(eventData.signupdeadline).toLocaleString(
                      "th-TH",
                      {
                        dateStyle: "long",
                        timeStyle: "short",
                      }
                    )}
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
