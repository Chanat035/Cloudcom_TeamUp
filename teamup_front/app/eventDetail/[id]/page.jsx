"use client";

import React, { useEffect, useState } from "react";
import MainLayout from "@/app/component/MainLayout.jsx";
import { API_URL } from "@/lib/config";
import { MapPin, Clock, User, ArrowLeft, Edit2, RectangleEllipsis } from "lucide-react";

function parseBangkok(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
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
          category: data.category ?? data.venue ?? "",
          imageField: data.image ?? data.photo ?? data.cover ?? "",
          description: data.description ?? data.detail ?? data.desc ?? "ไม่มีคำอธิบาย",
          owner: data.owner ?? data.user_id ?? data.owner_id ?? null,
          signupdeadline: data.signupdeadline ?? data.signUpDeadline ?? data.deadline ?? null,
        };

        setEventData(normalized);

        try {
          const imgRes = await fetch(`${API_URL}/api/getActivityImage/${id}`);
          if (imgRes.ok) {
            const imgJson = await imgRes.json();
            setImageUrl(imgJson.imageUrl || null);
          } else {
            setImageUrl(normalized.imageField || null);
          }
        } catch {
          setImageUrl(normalized.imageField || null);
        }

        if (normalized.owner) {
          try {
            const uRes = await fetch(`${API_URL}/api/user/${encodeURIComponent(normalized.owner)}`);
            if (uRes.ok) {
              const uJson = await uRes.json();
              setOwnerName(uJson.name || "ไม่ระบุ");
            } else {
              setOwnerName("ไม่ระบุ");
            }
          } catch {
            setOwnerName("ไม่ระบุ");
          }
        } else {
          setOwnerName("ไม่ระบุ");
        }

        try {
          const pRes = await fetch(`${API_URL}/api/eventDetail/${id}/checkParticipant`, {
            credentials: "include",
          });
          if (pRes.ok) {
            const pJson = await pRes.json();
            setJoined(Boolean(pJson.joined));
          } else {
            setJoined(false);
          }
        } catch {
          setJoined(false);
        }

        try {
          const participantsRes = await fetch(`${API_URL}/api/activity/${id}/participants`, {
            credentials: "include",
          });
          if (participantsRes.ok) {
            const parts = await participantsRes.json();
            const ownerId = normalized.owner;
            if (ownerId) {
              const foundOrganizerRecord = parts.find((r) => r.role === "organizer" && r.user_id === ownerId);
              if (foundOrganizerRecord) {
                try {
                  const sRes = await fetch(`${API_URL}/api/auth/status`, { credentials: "include" });
                  if (sRes.ok) {
                    const sJson = await sRes.json();
                    const sessionSub = sJson.userInfo?.sub;
                    setIsOrganizer(!!sessionSub && sessionSub === ownerId);
                  } else {
                    setIsOrganizer(false);
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
        } catch {
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
  }, []);

  const handleJoin = async () => {
    if (!eventData) return;
    setJoining(true);
    try {
      const res = await fetch(`${API_URL}/api/eventDetail/${eventData.id}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} - ${t}`);
      }
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
      const res = await fetch(`${API_URL}/api/eventDetail/${eventData.id}/cancel`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} - ${t}`);
      }
      setJoined(false);
      alert("คุณได้ออกจากกิจกรรมแล้ว");
    } catch (err) {
      console.error("cancel error:", err);
      alert("ไม่สามารถออกกิจกรรมได้: " + (err.message || ""));
    }
  };

  const handleEdit = () => {
    if (!eventData) return;
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
  const dateStr = start ? start.toLocaleString("th-TH", { dateStyle: "long" }) : "ไม่ระบุวันที่";
  const startTime = start
    ? start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";
  const endTime = end
    ? end.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-neutral-700 mb-4 hover:text-[#E35205] transition">
            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
          </button>

          <div className="rounded-3xl overflow-hidden bg-white/90 backdrop-blur border border-black/5 shadow-[0_12px_30px_rgba(0,0,0,.06)]">
            <div className="p-6 md:p-7 bg-gradient-to-r from-[#FF944D] via-[#E96B2B] to-[#E35205] text-white relative">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{eventData.name}</h1>
              <p className="text-sm md:text-[15px] text-white/90 mt-1">
                {dateStr}
                {start ? ` · ${startTime}` : ""}
                {end ? ` - ${endTime}` : ""}
                {eventData.location ? ` · ${eventData.location}` : ""}
              </p>
              <div className="absolute inset-0 pointer-events-none opacity-[.25] bg-[radial-gradient(600px_220px_at_60%_40%,#fff,transparent_60%)]" />
            </div>

            <div className="p-6 md:p-7 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-5">
                <div className="w-full max-h-[420px] flex items-center justify-center bg-white border border-orange-100 rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,.06)]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={eventData.name}
                      loading="lazy"
                      className="max-h-[420px] w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/default-activity.png";
                      }}
                    />
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center text-neutral-400">ไม่มีรูปภาพ</div>
                  )}
                </div>

                <div className="rounded-2xl p-5 bg-white/90 border border-orange-100 text-neutral-900 shadow-[0_6px_18px_rgba(0,0,0,.05)]">
                  <h3 className="font-semibold mb-2 text-lg">รายละเอียด</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{eventData.description}</p>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="card-info">
                  <h4 className="card-title">
                    <Clock className="w-4 h-4 text-[#E35205]" /> วันที่ & เวลา
                  </h4>
                  <div className="text-sm">
                    <div>{dateStr}</div>
                    {start && <div>{startTime}{end ? ` - ${endTime}` : ""}</div>}
                  </div>
                </div>

                <div className="card-info">
                  <h4 className="card-title">
                    <MapPin className="w-4 h-4 text-[#E35205]" /> สถานที่
                  </h4>
                  <div className="text-sm">{eventData.location}</div>
                </div>

                <div className="card-info">
                  <h4 className="card-title">
                    <RectangleEllipsis className="w-4 h-4 text-[#E35205]" /> ประเภท
                  </h4>
                  <div className="text-sm">{eventData.category}</div>
                </div>

                <div className="card-info">
                  <h4 className="card-title">
                    <User className="w-4 h-4 text-[#E35205]" /> ผู้จัด
                  </h4>
                  <div className="text-sm">{ownerName || "ไม่ระบุ"}</div>
                </div>

                <div className="flex gap-2">
                  {isOrganizer ? (
                    <button onClick={handleEdit} className="btn-ghost w-full">
                      <Edit2 className="w-4 h-4" /> แก้ไขรายละเอียด
                    </button>
                  ) : (
                    <>
                      {eventData.signupdeadline && new Date(eventData.signupdeadline) < new Date() ? (
                        <button disabled className="btn-disabled w-full">ปิดรับสมัคร</button>
                      ) : joined ? (
                        <>
                          <button disabled className="btn-disabled flex-1">เข้าร่วมแล้ว</button>
                          <button onClick={handleCancel} className="btn-ghost">ออกจากกิจกรรม</button>
                        </>
                      ) : (
                        <button onClick={handleJoin} disabled={joining} className="btn-primary w-full">
                          {joining ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {eventData.signupdeadline && (
                  <div className="text-sm text-neutral-600 mt-1.5">
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

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&display=swap');
        html, body { font-family: 'IBM Plex Sans Thai Looped', system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif; }
        .card-info{
          border-radius: 16px;
          background: rgba(255,255,255,.94);
          border: 1px solid rgba(227,82,5,.18);
          box-shadow: 0 8px 22px rgba(0,0,0,.05);
          padding: 16px;
          color: #111827;
        }
        .card-title{
          display:flex;align-items:center;gap:.5rem;
          font-weight:600;margin-bottom:.5rem;
        }
        .btn-primary{
          display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
          padding:.65rem 1rem;border-radius:12px;
          background: linear-gradient(90deg,#E96B2B,#E35205);
          color:#fff;font-weight:600;
          box-shadow:0 10px 26px rgba(227,82,5,.35);
          transition:transform .15s ease, filter .2s ease, box-shadow .2s ease;
          animation:pulseSoft 3s ease-in-out infinite;
        }
        .btn-primary:hover{ filter:brightness(.98); box-shadow:0 14px 32px rgba(227,82,5,.45); }
        .btn-primary:active{ transform:scale(.98); }
        .btn-ghost{
          display:inline-flex;align-items:center;gap:.5rem;
          padding:.6rem .9rem;border-radius:12px;
          background:#fff;border:1px solid rgba(0,0,0,.08); color:#111827;
          box-shadow:0 6px 16px rgba(0,0,0,.06);
          transition:background .2s ease, box-shadow .2s ease;
        }
        .btn-ghost:hover{ background:#fafafa; box-shadow:0 8px 22px rgba(0,0,0,.08); }
        .btn-disabled{
          padding:.6rem .9rem;border-radius:12px;
          background:#E5E7EB;color:#6B7280;cursor:not-allowed;
          box-shadow:0 0 0 rgba(0,0,0,0);
        }
        @keyframes pulseSoft{ 0%,100%{ box-shadow:0 10px 26px rgba(227,82,5,.35) } 50%{ box-shadow:0 12px 34px rgba(227,82,5,.45) } }
      `}</style>
    </MainLayout>
  );
}
