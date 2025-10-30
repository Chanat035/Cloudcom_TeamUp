// app/home/page.jsx
"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, RectangleEllipsis } from "lucide-react";
import { useRouter } from "next/navigation";
import MainLayout from "../component/MainLayout.jsx"

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

function pickDate(obj, keys = []) {
  for (const k of keys) {
    if (!obj) continue;
    const v = obj[k];
    if (!v && v !== 0) continue;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function adjustTimezoneMinus7(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(d.getHours() - 7);
  return d;
}

function formatDateRange(start, end) {
  const f = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  };
  if (!start && !end) return "วันที่ไม่ระบุ";
  if (start && end) {
    if (start.toDateString() === end.toDateString()) {
      return `${f(start)} - ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
    }
    return `${f(start)} - ${f(end)}`;
  }
  return f(start || end);
}

// If raw is a relative path or id, make absolute; used when backend gives '/uploads/..' or 'uploads/..'
function makeAbsoluteImageUrl(raw) {
  if (!raw) return "/default.jpg";
  if (typeof raw === "string" && (raw.startsWith("http://") || raw.startsWith("https://"))) return raw;
  // if raw looks like a file path or starts without slash
  return `${API.replace(/\/$/, "")}/${String(raw).replace(/^\/+/, "")}`;
}

// try fetching image via /api/getActivityImage/:id (expect JSON { imageUrl: "..."} or direct redirect)
async function tryFetchActivityImage(activityId) {
  try {
    const r = await fetch(`${API}/api/getActivityImage/${activityId}`);
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (j && (j.imageUrl || j.url || j.path)) {
      return makeAbsoluteImageUrl(j.imageUrl || j.url || j.path);
    }
    // if JSON not provided, maybe endpoint returns redirect to image — try r.url
    if (r.url && (r.url.endsWith(".jpg") || r.url.endsWith(".png") || r.url.includes("/uploads/"))) {
      return r.url;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// try to fetch user name from several endpoints (best-effort)
async function tryFetchUserName(userId) {
  if (!userId) return null;
  const candidates = [
    `${API}/api/user/${userId}`,
    `${API}/api/users/${userId}`,
    `${API}/api/profile/${userId}`
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      if (j) {
        if (j.name) return j.name;
        if (j.displayName) return j.displayName;
        if (j.username) return j.username;
        // sometimes user object nested
        if (j.user && (j.user.name || j.user.displayName)) return j.user.name || j.user.displayName;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [interests, setInterests] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");

  useEffect(() => {
    (async () => {
      try {
        // auth
        try {
          const authRes = await fetch(`${API}/api/auth/status`, { credentials: "include" });
          if (authRes.ok) {
            const authJson = await authRes.json();
            if (authJson.isAuthenticated) {
              setUser(authJson.userInfo || {});
              // profile image and interests best-effort
              try {
                const pRes = await fetch(`${API}/api/settings/getInterests`, { credentials: "include" });
                if (pRes.ok) {
                  const pj = await pRes.json();
                  setProfileImage(pj.imageUrl || pj.avatar || null);
                  if (Array.isArray(pj.interests)) setInterests(pj.interests);
                }
              } catch (e) {}
            } else {
              setUser(false);
            }
          } else {
            setUser(false);
          }
        } catch (e) {
          setUser(false);
        }

        // fetch events
        const r = await fetch(`${API}/api/eventSchedule`, { credentials: "include" });
        const json = r.ok ? await r.json() : [];

        const now = new Date();

        // normalize first pass
        const base = (json || []).map((ev) => {
          // detect name fields
          const title = ev.name || ev.title || ev.activityName || "กิจกรรม";
          // owner may be id or name; preserve both
          const ownerId = ev.owner || ev.ownerId || ev.createdBy || null;
          const ownerNameField = ev.ownerName || ev.owner_name || ev.ownerFullName || ev.ownerDisplayName || null;

          // image field may be string or object
          let rawImg = ev.imageUrl || ev.image || ev.picture || ev.image_path || (ev.imageObj && (ev.imageObj.url || ev.imageObj.path)) || null;
          if (rawImg && typeof rawImg === "object") rawImg = rawImg.url || rawImg.path || null;

          const start = adjustTimezoneMinus7(pickDate(ev, ['startDate','startdate','start','begin','start_at']));
          const end = adjustTimezoneMinus7(pickDate(ev, ['endDate','enddate','end','finish','end_at']));
          const signup = adjustTimezoneMinus7(pickDate(ev, ['signupdeadline','signUpDeadline','signup_deadline','registration_deadline']));

          return {
            raw: ev,
            id: ev.id || ev._id || ev.activityId,
            title,
            ownerId,
            ownerNameField,
            imageCandidate: rawImg,
            start,
            end,
            signupdeadline: signup,
            location: ev.location || ev.place || ev.venue || "",
            category: ev.category || "อื่นๆ",
          };
        });

        // filter: only activities with signupdeadline in future
        const filteredBase = base.filter(a => a.signupdeadline && a.signupdeadline > now);

        // enrich: for each activity, ensure ownerName and imageUrl resolved
        const enriched = await Promise.all(filteredBase.map(async (a) => {
          let ownerName = a.ownerNameField || null;
          // if ownerName missing or looks like an id (uuid-like or long hex), try fetch user endpoint
          const isIdLike = !ownerName && a.ownerId && typeof a.ownerId === "string" && /^[0-9a-fA-F\-]{8,}$/.test(a.ownerId);
          if (isIdLike) {
            const fetched = await tryFetchUserName(a.ownerId);
            if (fetched) ownerName = fetched;
          }
          if (!ownerName && a.ownerId && typeof a.ownerId === "string" && !isIdLike) ownerName = a.ownerId;
          if (!ownerName) ownerName = "ไม่ระบุชื่อผู้จัด";

          // image: if candidate is already absolute or relative, make absolute; otherwise try fetching via endpoint
          let imageUrl = null;
          if (a.imageCandidate) {
            imageUrl = makeAbsoluteImageUrl(a.imageCandidate);
          } else if (a.id) {
            // try backend endpoint returning JSON with image
            const fetchedImg = await tryFetchActivityImage(a.id);
            if (fetchedImg) imageUrl = fetchedImg;
          }
          if (!imageUrl) imageUrl = "/default.jpg";

          return {
            id: a.id,
            title: a.title,
            ownerName,
            imageUrl,
            start: a.start,
            end: a.end,
            signupdeadline: a.signupdeadline,
            location: a.location,
            category: a.category,
            raw: a.raw,
          };
        }));

        setActivities(enriched);
      } catch (err) {
        console.error("landing load error", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLogout() {
    try { await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" }); } catch (e) {}
    if (typeof window !== "undefined") window.location.reload();
  }

  const filtered = activities.filter((a) => {
    if (category !== "ทั้งหมด" && a.category !== category) return false;
    if (query && a.title && !a.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center items-center h-screen">กำลังโหลด...</div>;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-1 text-gray-900">สวัสดี, {user?.name?.split(" ")[0] || "ผู้ใช้"} 👋</h2>
        <p className="text-gray-800 mb-6">มีกิจกรรมดีๆ รออยู่ — ค้นหาและเข้าร่วมได้ง่าย ๆ</p>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-lg">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหากิจกรรม..." className="flex-1 px-4 py-2 border rounded-lg text-black" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-2 border rounded-lg text-black">
            <option>ทั้งหมด</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {filtered.length === 0 && <div className="bg-white p-6 rounded-xl text-center text-gray-700">ไม่พบกิจกรรม</div>}
            {filtered.map(a => (
              <div key={a.id} className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-48 h-48 bg-gray-100 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.imageUrl} alt={a.title} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{a.title}</h3>
                    <p className="text-gray-800 text-sm mb-2">{a.ownerName} • {a.location || "สถานที่ไม่ระบุ"}</p>
                    <p className="text-gray-700 text-sm flex items-center"><Calendar className="w-4 h-4 mr-2 text-blue-600" />{formatDateRange(a.start, a.end)}</p>
                    <p className="text-gray-700 text-sm flex items-center"><MapPin className="w-4 h-4 mr-2 text-blue-600" />{a.location || "-"}</p>
                    <p className="text-gray-700 text-sm flex items-center"><RectangleEllipsis className="w-4 h-4 mr-2 text-blue-600" />{a.category|| "-"}</p>
                    <p className="text-gray-700 text-sm mt-2">ลงทะเบียนได้ถึง: {a.signupdeadline ? formatDateRange(a.signupdeadline, null) : "ไม่ระบุ"}</p>
                    <button onClick={() => router.push(`/eventDetail/${a.id}`)} className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition">ดูรายละเอียด</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-3">กิจกรรมที่จะปิดรับภายใน 10 วัน</h3>
              {activities.filter(a => a.signupdeadline && (a.signupdeadline > new Date()) && ((a.signupdeadline - new Date()) < 10*24*60*60*1000))
                .sort((x,y) => new Date(x.signupdeadline) - new Date(y.signupdeadline))
                .slice(0,3)
                .map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/eventDetail/${ev.id}`)}>
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                      <p className="text-xs text-gray-700">{formatDateRange(ev.signupdeadline, null)}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* show interest block ONLY if interests exist */}
            {Array.isArray(interests) && interests.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-lg font-bold text-gray-900 mb-3">ความสนใจของคุณ</h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((i) => <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{i}</span>)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  </MainLayout>
  );
}
