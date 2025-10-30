// app/home/page.jsx
"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "../components/header.jsx";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3100";

const CATEGORIES = [
  "กีฬา",
  "ศิลปะและวัฒนธรรม",
  "การศึกษา",
  "เทคโนโลยี",
  "สุขภาพและความงาม",
  "ธุรกิจและการตลาด",
  "การท่องเที่ยว",
  "อาสาสมัครและการกุศล",
  "อื่นๆ",
];

// helper: pick date from several possible keys and return Date or null
function pickDate(obj, keys = []) {
  for (const k of keys) {
    if (!obj) continue;
    const v = obj[k];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "string") {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
      const n = Number(v);
      if (!Number.isNaN(n)) return new Date(n);
    }
    if (typeof v === "number") return new Date(v);
    if (v instanceof Date) return v;
  }
  return null;
}

// format date(s) -> dd/mm/yyyy hh:mm-hh:mm (if same day) or full range if different day
function formatActivityDate(startIso, endIso) {
  const toParts = (iso) => {
    if (!iso) return null;
    const d = iso instanceof Date ? iso : new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return { dd, mm, yyyy, hh, mins, raw: d };
  };

  const s = toParts(startIso);
  const e = toParts(endIso);

  if (!s && !e) return "วันที่ไม่ระบุ";
  if (s && e) {
    if (s.raw.toDateString() === e.raw.toDateString()) {
      return `${s.dd}/${s.mm}/${s.yyyy} ${s.hh}:${s.mins}-${e.hh}:${e.mins}`;
    }
    return `${s.dd}/${s.mm}/${s.yyyy} ${s.hh}:${s.mins} - ${e.dd}/${e.mm}/${e.yyyy} ${e.hh}:${e.mins}`;
  }
  if (s) return `${s.dd}/${s.mm}/${s.yyyy} ${s.hh}:${s.mins}`;
  return `${e.dd}/${e.mm}/${e.yyyy} ${e.hh}:${e.mins}`;
}

function resolveImageUrl(rawUrl) {
  if (!rawUrl) return "/images/default-activity.png"; // put a default in public/images/
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  // ensure API doesn't have trailing slash
  const base = API.replace(/\/$/, "");
  return base + "/" + rawUrl.replace(/^\//, "");
}

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [interests, setInterests] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

  useEffect(() => {
    (async () => {
      try {
        // 1) auth status
        try {
          const authRes = await fetch(`${API}/api/auth/status`, { credentials: "include" });
          if (authRes.ok) {
            const authJson = await authRes.json();
            if (authJson.isAuthenticated) {
              setUser(authJson.userInfo || {});
              // profile image (best-effort)
              try {
                const pRes = await fetch(`${API}/api/getProfile`, { credentials: "include" });
                if (pRes.ok) {
                  const pj = await pRes.json();
                  setProfileImage(pj.imageUrl || pj.avatar || null);
                }
              } catch (e) { /* ignore */ }

              // load interests (we still display locked message per your request)
              try {
                const iRes = await fetch(`${API}/api/settings/getInterests`, { credentials: "include" });
                if (iRes.ok) {
                  const ij = await iRes.json();
                  setInterests(Array.isArray(ij.interests) ? ij.interests : []);
                }
              } catch (e) {}
            } else {
              setUser(false);
            }
          } else {
            setUser(false);
          }
        } catch (err) {
          setUser(false);
        }

        // 2) fetch events
        const evRes = await fetch(`${API}/api/eventSchedule`);
        const evJson = evRes.ok ? await evRes.json() : [];
        console.debug("eventSchedule raw sample:", Array.isArray(evJson) ? evJson.slice(0,3) : evJson);

        const now = new Date();

        // normalize & enrich
        const normalized = await Promise.all((evJson || []).map(async (ev) => {
          // pick dates from common keys
          const signup = pickDate(ev, ['signupdeadline','signUpDeadline','signup_deadline','registration_deadline','registerBy']);
          const start = pickDate(ev, ['startdate','startDate','start','begin','start_at']);
          const end = pickDate(ev, ['enddate','endDate','end','finish','end_at']);

          // owner name: try common fields; if only id available, attempt to fetch user endpoint
          const ownerId = ev.owner || ev.ownerId || ev.createdBy || ev.userId;
          let ownerName = ev.ownerName || ev.owner_name || ev.ownerFullName || ev.ownerDisplay || ev.ownerDisplayName || null;

          if (!ownerName && ownerId) {
            // best-effort fetch; don't block on failure
            try {
              const r = await fetch(`${API}/api/user/${ownerId}`);
              if (r.ok) {
                const uj = await r.json();
                ownerName = uj.name || uj.displayName || uj.username || ownerId;
              } else {
                ownerName = ownerId;
              }
            } catch (e) {
              ownerName = ownerId;
            }
          }

          // image
          let rawImg = ev.imageUrl || ev.image || ev.picture || ev.image_path || (ev.imageObj && ev.imageObj.url) || null;
          // sometimes backend returns JSON object for image inside 'image' field
          if (rawImg && typeof rawImg === 'object') {
            rawImg = rawImg.url || rawImg.path || null;
          }
          const imageUrl = resolveImageUrl(rawImg);

          return {
            id: ev.id || ev._id || ev.activityId,
            title: ev.name || ev.title || ev.activityName || "กิจกรรม",
            ownerId,
            ownerName: ownerName || ownerId || "ผู้จัด",
            category: ev.category || "อื่นๆ",
            startDate: start ? start.toISOString() : null,
            endDate: end ? end.toISOString() : null,
            signupdeadline: signup ? signup.toISOString() : null,
            location: ev.location || ev.place || ev.venue || "",
            imageUrl,
            raw: ev,
          };
        }));

        // filter: show only activities that still open for signup (signupdeadline > now)
        const filtered = normalized.filter(a => a.signupdeadline && new Date(a.signupdeadline) > now);

        setActivities(filtered);
      } catch (err) {
        console.error("Load landing error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch (e) { /* ignore */ }
    setUser(false);
    if (typeof window !== "undefined") window.location.reload();
  };

  const filtered = activities.filter((a) => {
    if (selectedCategory !== "ทั้งหมด" && a.category !== selectedCategory) return false;
    if (query && !a.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header user={user} profileImage={profileImage} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            สวัสดี{user && user !== false ? `, ${ (user.name || user.preferred_username || user.email).split(" ")[0]}` : ""} 👋
          </h2>
          <p className="text-gray-700">มีกิจกรรมดีๆ รออยู่ — ค้นหาและเข้าร่วมได้ง่าย ๆ</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Search & Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                    placeholder="ค้นหากิจกรรม..."
                    className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-300">
                    <option>ทั้งหมด</option>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filtered.length === 0 && (
                <div className="bg-white p-6 rounded-xl text-center text-gray-700">ไม่พบกิจกรรม</div>
              )}

              {filtered.map((activity) => (
                <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-48 h-48 sm:h-auto bg-gray-100 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activity.imageUrl} alt={activity.title} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">{activity.title}</h3>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{activity.ownerName || ""} • {activity.location || "สถานที่ไม่ระบุ"}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-700">
                          <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                          <span>{formatActivityDate(activity.startDate ? new Date(activity.startDate) : null, activity.endDate ? new Date(activity.endDate) : null)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                          <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                          <span>{activity.location || "-"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">ลงทะเบียนได้ถึง: {activity.signupdeadline ? formatActivityDate(new Date(activity.signupdeadline), null) : "ไม่ระบุ"}</div>
                        <button onClick={() => router.push(`/eventDetail/${activity.id}`)} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition transform hover:scale-105">
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">กิจกรรมที่จะปิดรับภายใน 10 วัน</h3>
              {activities
                .filter(a => a.signupdeadline && (new Date(a.signupdeadline) > new Date()) && (new Date(a.signupdeadline) <= new Date(Date.now() + 10*24*60*60*1000)))
                .sort((x, y) => new Date(x.signupdeadline) - new Date(y.signupdeadline))
                .slice(0, 3)
                .map(ev => (
                  <div key={ev.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition cursor-pointer" onClick={() => router.push(`/eventDetail/${ev.id}`)}>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{ev.title}</h4>
                      <p className="text-xs text-gray-500">{ev.signupdeadline ? formatActivityDate(new Date(ev.signupdeadline), null) : "ไม่ระบุ"}</p>
                    </div>
                  </div>
                ))
              }
              {activities.filter(a => a.signupdeadline && (new Date(a.signupdeadline) > new Date()) && (new Date(a.signupdeadline) <= new Date(Date.now() + 10*24*60*60*1000))).length === 0 && (
                <p className="text-sm text-gray-500">ไม่มีกิจกรรมใกล้ปิดรับ</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">ความสนใจของคุณ</h3>
              <div className="flex flex-wrap gap-2">
                {interests && interests.length > 0 ? (
                  interests.map((it, i) => <span key={i} className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium">{it}</span>)
                ) : (
                  <p className="text-sm text-gray-500">(ล็อกอินเพื่อจัดการความสนใจ)</p>
                )}
                <button onClick={() => router.push("/profile")} className="px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-full text-sm font-medium hover:border-blue-400 hover:text-blue-600 transition">+ เพิ่ม</button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
