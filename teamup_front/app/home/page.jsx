"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "../component/header.jsx";

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
    if (!v) continue;
    const d = new Date(v);
    if (!isNaN(d)) return d;
  }
  return null;
}

function adjustTimezone(date) {
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
      return `${f(start)} - ${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}`;
    }
    return `${f(start)} - ${f(end)}`;
  }
  return f(start || end);
}

function resolveImageUrl(rawUrl) {
  if (!rawUrl) return "/default.jpg";
  if (rawUrl.startsWith("http")) return rawUrl;
  return `${API}/${rawUrl.replace(/^\/+/, "")}`;
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
        const authRes = await fetch(`${API}/api/auth/status`, { credentials: "include" });
        const authData = await authRes.json();
        if (authData.isAuthenticated) {
          setUser(authData.userInfo);
          const profileRes = await fetch(`${API}/api/getProfile`, { credentials: "include" });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            setProfileImage(profile.imageUrl);
            setInterests(profile.interests || []);
          }
        }

        const actRes = await fetch(`${API}/api/eventSchedule`);
        const data = await actRes.json();
        const now = new Date();
        const normalized = data.map((a) => {
          const start = adjustTimezone(pickDate(a, ["startDate", "startdate", "start"]));
          const end = adjustTimezone(pickDate(a, ["endDate", "enddate", "end"]));
          const signup = adjustTimezone(pickDate(a, ["signupdeadline", "signUpDeadline"]));
          return {
            id: a.id || a._id,
            name: a.name,
            ownerName: a.ownerName || a.owner_name || a.ownerFullName || a.owner || "ไม่ระบุชื่อผู้จัด",
            imageUrl: resolveImageUrl(a.imageUrl || a.image || a.picture),
            location: a.location || "ไม่ระบุสถานที่",
            category: a.category || "อื่นๆ",
            start,
            end,
            signupdeadline: signup,
          };
        }).filter(a => a.signupdeadline && a.signupdeadline > now);

        setActivities(normalized);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    router.refresh();
  };

  const filtered = activities.filter(a =>
    (category === "ทั้งหมด" || a.category === category) &&
    a.name.toLowerCase().includes(query.toLowerCase())
  );

  if (loading) return <div className="flex justify-center items-center h-screen">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header user={user} profileImage={profileImage} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-1 text-gray-900">
          สวัสดี, {user?.name?.split(" ")[0] || "ผู้ใช้"} 👋
        </h2>
        <p className="text-gray-800 mb-6">มีกิจกรรมดีๆ รออยู่ — ค้นหาและเข้าร่วมได้ง่าย ๆ</p>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-lg">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหากิจกรรม..."
            className="flex-1 px-4 py-2 border rounded-lg text-black"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg text-black"
          >
            <option>ทั้งหมด</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {filtered.map((a) => (
              <div key={a.id} className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-48 h-48 bg-gray-100 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.imageUrl} alt={a.name} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{a.name}</h3>
                    <p className="text-gray-800 text-sm mb-2">{a.ownerName} • {a.location}</p>
                    <p className="text-gray-700 text-sm flex items-center"><Calendar className="w-4 h-4 mr-2 text-blue-600" />{formatDateRange(a.start, a.end)}</p>
                    <p className="text-gray-700 text-sm flex items-center"><MapPin className="w-4 h-4 mr-2 text-blue-600" />{a.location}</p>
                    <p className="text-gray-700 text-sm mt-2">ลงทะเบียนได้ถึง: {a.signupdeadline ? formatDateRange(a.signupdeadline, null) : "ไม่ระบุ"}</p>
                    <button onClick={() => router.push(`/eventDetail/${a.id}`)} className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition">
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-3">กิจกรรมที่จะปิดรับภายใน 10 วัน</h3>
              {activities
                .filter(a => a.signupdeadline && a.signupdeadline - new Date() < 10 * 24 * 60 * 60 * 1000)
                .slice(0, 3)
                .map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/eventDetail/${a.id}`)}>
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{a.name}</p>
                      <p className="text-xs text-gray-700">{formatDateRange(a.signupdeadline, null)}</p>
                    </div>
                  </div>
                ))}
            </div>

            {interests.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-lg font-bold text-gray-900 mb-3">ความสนใจของคุณ</h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
