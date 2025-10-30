"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import { API_URL } from "@/lib/config";

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

function formatActivityDate(start, end) {
  const toDMY = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return { dd, mm, yyyy, hh, mins, raw: d };
  };
  const s = toDMY(start);
  const e = toDMY(end);
  if (!s && !e) return "วันที่ไม่ระบุ";
  if (s && e && s.raw.toDateString() === e.raw.toDateString())
    return `${s.dd}/${s.mm}/${s.yyyy} ${s.hh}:${s.mins}-${e.hh}:${e.mins}`;
  if (s) return `${s.dd}/${s.mm}/${s.yyyy} ${s.hh}:${s.mins}`;
  return `${e.dd}/${e.mm}/${e.yyyy} ${e.hh}:${e.mins}`;
}

export default function LandingPage() {
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");

  useEffect(() => {
    (async () => {
      try {
        const auth = await fetch(`${API_URL}/api/auth/status`, { credentials: "include" });
        const authData = await auth.json();
        if (authData.isAuthenticated) {
          setUser(authData.userInfo);
          const profile = await fetch(`${API_URL}/api/getProfile`, { credentials: "include" });
          if (profile.ok) {
            const data = await profile.json();
            setProfileImage(data.imageUrl);
          }
        }

        const res = await fetch(`${API_URL}/api/eventSchedule`);
        const data = await res.json();
        const now = new Date();

        const filtered = data.filter(
          (a) => new Date(a.signupdeadline || a.signUpDeadline) > now
        );

        setActivities(filtered);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(false);
    router.refresh();
  };

  const filtered = activities.filter((a) => {
    const matchQuery = a.name.toLowerCase().includes(query.toLowerCase());
    const matchCat = category === "ทั้งหมด" || a.category === category;
    return matchQuery && matchCat;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        กำลังโหลดข้อมูล...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header user={user} profileImage={profileImage} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-4">
          สวัสดี{user ? `, ${user.name?.split(" ")[0] || ""}` : ""} 👋
        </h2>

        {/* ค้นหาและกรอง */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-lg">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหากิจกรรม..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option>ทั้งหมด</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* กิจกรรม */}
        <div className="grid gap-4">
          {filtered.length === 0 && (
            <div className="bg-white p-6 text-center rounded-lg">
              ไม่พบกิจกรรม
            </div>
          )}
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-shrink-0 w-full sm:w-48 h-48 bg-gray-100 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.imageUrl || "/default.jpg"}
                    alt={a.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{a.name}</h3>
                  <p className="text-gray-500 text-sm mb-2">
                    {a.ownerName || a.owner} • {a.location}
                  </p>
                  <p className="flex items-center text-gray-600 text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                    {formatActivityDate(a.startDate, a.endDate)}
                  </p>
                  <p className="flex items-center text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                    {a.location || "-"}
                  </p>
                  <button
                    onClick={() => router.push(`/eventDetail/${a.id}`)}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg"
                  >
                    ดูรายละเอียด
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
