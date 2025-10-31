"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, RectangleEllipsis, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import MainLayout from "../component/MainLayout.jsx";

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

/* ---------- utils ---------- */
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
      return `${f(start)} - ${String(end.getHours()).padStart(2, "0")}:${String(
        end.getMinutes()
      ).padStart(2, "0")}`;
    }
    return `${f(start)} - ${f(end)}`;
  }
  return f(start || end);
}
function makeAbsoluteImageUrl(raw) {
  if (!raw) return "/default.jpg";
  if (typeof raw === "string" && (raw.startsWith("http://") || raw.startsWith("https://"))) return raw;
  return `${API.replace(/\/$/, "")}/${String(raw).replace(/^\/+/, "")}`;
}
async function tryFetchActivityImage(activityId) {
  try {
    const r = await fetch(`${API}/api/getActivityImage/${activityId}`);
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (j && (j.imageUrl || j.url || j.path)) return makeAbsoluteImageUrl(j.imageUrl || j.url || j.path);
    if (r.url && (r.url.endsWith(".jpg") || r.url.endsWith(".png") || r.url.includes("/uploads/"))) return r.url;
    return null;
  } catch { return null; }
}
async function tryFetchUserName(userId) {
  if (!userId) return null;
  const candidates = [
    `${API}/api/user/${userId}`,
    `${API}/api/users/${userId}`,
    `${API}/api/profile/${userId}`,
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
        if (j.user && (j.user.name || j.user.displayName)) return j.user.name || j.user.displayName;
      }
    } catch {}
  }
  return null;
}

/* ---------- page ---------- */
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
        try {
          const authRes = await fetch(`${API}/api/auth/status`, { credentials: "include" });
          if (authRes.ok) {
            const authJson = await authRes.json();
            if (authJson.isAuthenticated) {
              setUser(authJson.userInfo || {});
              try {
                const pRes = await fetch(`${API}/api/settings/getInterests`, { credentials: "include" });
                if (pRes.ok) {
                  const pj = await pRes.json();
                  setProfileImage(pj.imageUrl || pj.avatar || null);
                  if (Array.isArray(pj.interests)) setInterests(pj.interests);
                }
              } catch {}
            } else setUser(false);
          } else setUser(false);
        } catch { setUser(false); }

        const r = await fetch(`${API}/api/eventSchedule`, { credentials: "include" });
        const json = r.ok ? await r.json() : [];
        const now = new Date();

        const base = (json || []).map((ev) => {
          const title = ev.name || ev.title || ev.activityName || "กิจกรรม";
          const ownerId = ev.owner || ev.ownerId || ev.createdBy || null;
          const ownerNameField = ev.ownerName || ev.owner_name || ev.ownerFullName || ev.ownerDisplayName || null;

          let rawImg = ev.imageUrl || ev.image || ev.picture || ev.image_path || (ev.imageObj && (ev.imageObj.url || ev.imageObj.path)) || null;
          if (rawImg && typeof rawImg === "object") rawImg = rawImg.url || rawImg.path || null;

          const start = adjustTimezoneMinus7(pickDate(ev, ["startDate","startdate","start","begin","start_at"]));
          const end = adjustTimezoneMinus7(pickDate(ev, ["endDate","enddate","end","finish","end_at"]));
          const signup = adjustTimezoneMinus7(pickDate(ev, ["signupdeadline","signUpDeadline","signup_deadline","registration_deadline"]));

          return {
            raw: ev, id: ev.id || ev._id || ev.activityId, title,
            ownerId, ownerNameField, imageCandidate: rawImg,
            start, end, signupdeadline: signup,
            location: ev.location || ev.place || ev.venue || "",
            category: ev.category || "อื่นๆ",
          };
        });

        const filteredBase = base.filter(a => a.signupdeadline && a.signupdeadline > now);

        const enriched = await Promise.all(filteredBase.map(async (a) => {
          let ownerName = a.ownerNameField || null;
          const isIdLike = !ownerName && a.ownerId && typeof a.ownerId === "string" && /^[0-9a-fA-F\-]{8,}$/.test(a.ownerId);
          if (isIdLike) {
            const fetched = await tryFetchUserName(a.ownerId);
            if (fetched) ownerName = fetched;
          }
          if (!ownerName && a.ownerId && typeof a.ownerId === "string" && !isIdLike) ownerName = a.ownerId;
          if (!ownerName) ownerName = "ไม่ระบุชื่อผู้จัด";

          let imageUrl = null;
          if (a.imageCandidate) imageUrl = makeAbsoluteImageUrl(a.imageCandidate);
          else if (a.id) {
            const fetchedImg = await tryFetchActivityImage(a.id);
            if (fetchedImg) imageUrl = fetchedImg;
          }
          if (!imageUrl) imageUrl = "/default.jpg";

          return {
            id:a.id, title:a.title, ownerName, imageUrl,
            start:a.start, end:a.end, signupdeadline:a.signupdeadline,
            location:a.location, category:a.category, raw:a.raw
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
    try { await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" }); } catch {}
    if (typeof window !== "undefined") window.location.reload();
  }

  const filtered = activities.filter((a) => {
    if (category !== "ทั้งหมด" && a.category !== category) return false;
    if (query && a.title && !a.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="page-bg">
          <main className="max-w-7xl mx-auto px-6 py-10">
            <section className="hero">
              <div className="hero-overlay" />
              <div className="skeleton h-8 w-72 mb-4" />
              <div className="skeleton h-5 w-[28rem] max-w-full mb-6" />
              <div className="skeleton h-12 w-full max-w-3xl rounded-2xl" />
            </section>
          </main>
        </div>
        <StyleBlock />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="page-bg">
        <main className="max-w-7xl mx-auto px-6 py-10">
          {/* HERO */}
          <section className="hero">
            <div className="hero-overlay" />
            <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900">
              ยินดีต้อนรับสู่ <span className="font-extrabold">TeamUp</span> 💫
            </h2>
            <p className="mt-2 text-lg text-neutral-800 leading-relaxed">
              ค้นหาแรงบันดาลใจใหม่ ๆ ในแคมปัสของคุณ 💫
              <br className="hidden sm:block" />
              เข้าร่วมกิจกรรมที่ใช่ และสร้างความทรงจำไปกับเพื่อน ๆ ที่ TeamUp!
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E35205]/70" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหากิจกรรม..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/60 bg-white/95
                             text-neutral-900 placeholder:text-neutral-400
                             focus:outline-none focus:ring-2 focus:ring-[#E35205]/40 shadow-soft"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-white/60 bg-white/95 text-neutral-900
                           focus:outline-none focus:ring-2 focus:ring-[#E35205]/40 shadow-soft"
              >
                <option>ทั้งหมด</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </section>

          {/* GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* list */}
            <div className="lg:col-span-2 space-y-6">
              {filtered.length === 0 && (
                <div className="card text-center py-12">
                  <p className="text-lg font-medium text-neutral-700">ไม่พบกิจกรรม</p>
                  <p className="text-sm text-neutral-500 mt-1">ลองลบตัวกรองหรือค้นหาคำอื่น</p>
                </div>
              )}

              {filtered.map((a, i) => (
                <article key={a.id} className="card hover:-translate-y-1" style={{animationDelay:`${i*70}ms`}}>
                  <div className="flex flex-col sm:flex-row gap-0 sm:gap-6">
                    <div className="relative sm:w-56 overflow-hidden rounded-2xl sm:rounded-xl">
                      <img src={a.imageUrl} alt={a.title} className="h-48 w-full sm:h-full object-cover img-zoom" />
                      <span className="shine" />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-semibold text-neutral-900">{a.title}</h3>
                        <span className="badge">{a.category || "-"}</span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">
                        {a.ownerName} • {a.location || "สถานที่ไม่ระบุ"}
                      </p>
                      <div className="mt-3 space-y-1.5 text-sm text-neutral-700">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#E35205]" />
                          {formatDateRange(a.start, a.end)}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#E35205]" />
                          {a.location || "-"}
                        </p>
                        <p className="flex items-center gap-2">
                          <RectangleEllipsis className="h-4 w-4 text-[#E35205]" />
                          {a.category || "-"}
                        </p>
                      </div>
                      <p className="mt-3 text-sm text-neutral-700">
                        ลงทะเบียนได้ถึง: {a.signupdeadline ? formatDateRange(a.signupdeadline, null) : "ไม่ระบุ"}
                      </p>
                      <button onClick={() => router.push(`/eventDetail/${a.id}`)} className="btn-primary">
                        ดูรายละเอียด
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* sidebar */}
            <aside className="space-y-6">
              <div className="card overflow-visible">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">กิจกรรมที่จะปิดรับภายใน 10 วัน</h3>
                {activities
                  .filter(a => a.signupdeadline && (a.signupdeadline > new Date()) && ((a.signupdeadline - new Date()) < 10*24*60*60*1000))
                  .sort((x,y) => new Date(x.signupdeadline) - new Date(y.signupdeadline))
                  .slice(0,3)
                  .map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => router.push(`/eventDetail/${ev.id}`)}
                      className="flex items-start gap-3 rounded-xl p-3 hover:bg-[#FFF3EA] cursor-pointer transition"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#E35205] flex items-center justify-center shadow-soft">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 text-sm">{ev.title}</p>
                        <p className="text-xs text-neutral-600">{formatDateRange(ev.signupdeadline, null)}</p>
                      </div>
                    </div>
                  ))}
              </div>

              {Array.isArray(interests) && interests.length > 0 && (
                <div className="card overflow-visible">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">ความสนใจของคุณ</h3>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((i) => (
                      <span key={i} className="badge">{i}</span>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>

      <StyleBlock />
    </MainLayout>
  );
}

/* ---------- styles ---------- */
function StyleBlock() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@300;400;500;600;700&display=swap');
      html, body { font-family: 'IBM Plex Sans Thai Looped', sans-serif; }

      .page-bg {
        --c1:#FFF3E9; --c2:#FFFDF9; --c3:#FFE7D6;
        background: radial-gradient(1200px 600px at 15% -10%, var(--c3) 0, var(--c2) 45%, var(--c1) 70%);
        background-size: 160% 160%;
        animation: bgShift 24s ease-in-out infinite;
      }
      @keyframes bgShift {
        0%{ background-position: 0% 50% }
        50%{ background-position: 100% 50% }
        100%{ background-position: 0% 50% }
      }

      .hero {
        position: relative;
        overflow: hidden;
        border-radius: 24px;
        padding: 28px 24px;
        background: linear-gradient(120deg, #FFD0A6, #FF944D, #E35205);
        background-size: 220% 220%;
        animation: heroFlow 12s ease-in-out infinite;
        box-shadow: 0 18px 50px rgba(227,82,5,.18);
      }
      .hero-overlay {
        position: absolute;
        inset: 0;
        background: radial-gradient(600px 220px at 65% 55%, rgba(255,255,255,.55), transparent 60%);
        mix-blend-mode: screen;
        filter: blur(2px);
        animation: glowShift 10s ease-in
