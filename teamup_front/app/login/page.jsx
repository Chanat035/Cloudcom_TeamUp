"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Heart,
  Search,
  Filter,
  Plus,
  Settings,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  API_URL // ต้องมีการตั้งค่าใน /lib/config เหมือนของเดิม
} from "@/lib/config";

export default function LandingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [user, setUser] = useState(null); // null = not loaded, false = not auth, object = user
  const [profileImage, setProfileImage] = useState(null);
  const [interests, setInterests] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const categories = ["ทั้งหมด", "กีฬา", "ดนตรี", "อาสา", "การเรียนรู้", "ศิลปะ"];

  useEffect(() => {
    // load data on mount
    (async () => {
      try {
        // 1) check auth status & user info
        const authRes = await fetch(`${API_URL}/api/auth/status`, {
          credentials: "include",
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.isAuthenticated) {
            setUser(authData.userInfo || {});
            // get profile image (may 401 if not authenticated)
            try {
              const pRes = await fetch(`${API_URL}/api/getProfile`, {
                credentials: "include",
              });
              if (pRes.ok) {
                const pjson = await pRes.json();
                setProfileImage(pjson.imageUrl || null);
              }
            } catch (err) {
              // ignore image error
            }

            // get interests
            try {
              const iRes = await fetch(`${API_URL}/api/settings/getInterests`, {
                credentials: "include",
              });
              if (iRes.ok) {
                const ij = await iRes.json();
                setInterests(Array.isArray(ij.interests) ? ij.interests : []);
              }
            } catch (err) {}
          } else {
            setUser(false); // not authenticated
          }
        } else {
          setUser(false);
        }

        // 2) fetch activities
        const evRes = await fetch(`${API_URL}/api/eventSchedule`);
        if (!evRes.ok) throw new Error("Cannot fetch activities");
        const evJson = await evRes.json();

        // 3) for each activity fetch its image (non-auth endpoint) and, if authenticated, participants
        const activitiesWithMeta = await Promise.all(
          evJson.map(async (act) => {
            const a = {
              id: act.id,
              title: act.name,
              owner: act.owner,
              category: act.category,
              startDate: act.startdate || act.startDate || act.startdate || act.startDate,
              endDate: act.enddate || act.endDate,
              signUpDeadline: act.signupdeadline || act.signUpDeadline || act.signUpDeadline,
              description: act.description,
              location: act.location,
              participants: null,
              maxParticipants: act.maxParticipants || null,
              imageUrl: null,
              urgent: false,
            };

            // image
            try {
              const imgRes = await fetch(`${API_URL}/api/getActivityImage/${act.id}`);
              if (imgRes.ok) {
                const imgJson = await imgRes.json();
                a.imageUrl = imgJson.imageUrl || null;
              }
            } catch (err) {
              a.imageUrl = null;
            }

            // participants count only if user authenticated
            if (user && user !== false) {
              try {
                const pRes = await fetch(`${API_URL}/api/activity/${act.id}/participants`, {
                  credentials: "include",
                });
                if (pRes.ok) {
                  const pJson = await pRes.json();
                  // pJson is array of participants
                  a.participants = Array.isArray(pJson) ? pJson.filter(p => p.status === "joined").length : null;
                } else {
                  a.participants = null;
                }
              } catch (err) {
                a.participants = null;
              }
            }

            return a;
          })
        );

        setActivities(activitiesWithMeta);
      } catch (err) {
        console.error("Load landing data failed:", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  const handleLogin = () => {
    window.location.href = `${API_URL}/login`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(false);
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const filteredActivities = activities.filter((a) => {
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
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  TeamUp
                </h1>
              </div>

              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-gray-900 font-medium hover:text-blue-600 transition">หน้าหลัก</a>
                <a href="/eventSchedule" className="text-gray-500 hover:text-gray-900 transition">กิจกรรมทั้งหมด</a>
                <a href="/myActivities" className="text-gray-500 hover:text-gray-900 transition">กิจกรรมของฉัน</a>
                <a href="/createActivity" className="text-gray-500 hover:text-gray-900 transition">สร้างกิจกรรม</a>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/createActivity")}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">สร้างกิจกรรม</span>
              </button>

              <div className="flex items-center space-x-3 pl-4 border-l border-gray-300">
                {user && user !== false ? (
                  <>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-gray-900">{user.name || user.preferred_username || user.email}</div>
                      <div className="text-xs text-gray-500">{user.email || ""}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                      {profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileImage} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-white font-semibold bg-gradient-to-r from-blue-600 to-purple-600 w-full h-full flex items-center justify-center">
                          { (user.name || user.email || "U").toString().charAt(0).toUpperCase() }
                        </div>
                      )}
                    </div>
                    <button onClick={handleLogout} title="Logout" className="ml-2 text-red-600">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 text-white rounded-md">เข้าสู่ระบบ</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            สวัสดี{user && user !== false ? `, ${ (user.name || user.preferred_username || user.email).split(" ")[0]}` : ""} 👋
          </h2>
          <p className="text-gray-600">มีกิจกรรมดีๆ รออยู่ — ค้นหาและเข้าร่วมได้ง่าย ๆ</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activities */}
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                </div>
                <button className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">ตัวกรอง</span>
                </button>
              </div>

              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Cards */}
            <div className="space-y-4">
              {filteredActivities.length === 0 && (
                <div className="bg-white p-6 rounded-xl text-center text-gray-600">ไม่พบกิจกรรม</div>
              )}

              {filteredActivities.map((activity) => {
                const percent = activity.maxParticipants && activity.participants != null
                  ? Math.round((activity.participants / activity.maxParticipants) * 100)
                  : 0;

                return (
                  <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-48 h-48 sm:h-auto bg-gray-100 flex items-center justify-center overflow-hidden">
                        {activity.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={activity.imageUrl} alt={activity.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white p-4">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-80" />
                            <div className="font-semibold">{activity.category || "กิจกรรม"}</div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                                {activity.title}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{activity.owner || ""} • {activity.location || "สถานที่ไม่ระบุ"}</p>
                          </div>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <Heart className="w-5 h-5 text-gray-400 hover:text-red-500 transition" />
                          </button>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                            <span>{activity.startDate || "วันที่ไม่ระบุ"} {activity.endDate ? `— ${activity.endDate}` : ""}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                            <span>{activity.location || "-"}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-4 h-4 mr-2 text-blue-600" />
                            <span>{ activity.participants != null ? `${activity.participants}${activity.maxParticipants ? ` / ${activity.maxParticipants}` : ""} คน` : "จำนวนผู้เข้าร่วม: (ต้องล็อกอินเพื่อดู)" }</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                          <button
                            onClick={() => router.push(`/eventDetail/${activity.id}`)}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition transform hover:scale-105"
                          >
                            ดูรายละเอียด
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">กิจกรรมที่กำลังจะมาถึง</h3>
              <div className="space-y-3">
                {activities.slice(0, 3).map(ev => (
                  <div key={ev.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition cursor-pointer" onClick={() => router.push(`/eventDetail/${ev.id}`)}>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{ev.title}</h4>
                      <p className="text-xs text-gray-500">{ev.startDate || "วันที่ไม่ระบุ"}</p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && <p className="text-sm text-gray-500">ไม่มีรายการ</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">ความสนใจของคุณ</h3>
              <div className="flex flex-wrap gap-2">
                {(interests && interests.length > 0) ? interests.map((it, i) => (
                  <span key={i} className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium">
                    {it}
                  </span>
                )) : <p className="text-sm text-gray-500">(ล็อกอินเพื่อจัดการความสนใจ)</p>}
                <button onClick={() => router.push("/profile")} className="px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-full text-sm font-medium hover:border-blue-400 hover:text-blue-600 transition">
                  + เพิ่ม
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">เมนูด่วน</h3>
              <div className="space-y-2">
                <button onClick={() => router.push("/createActivity")} className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition">
                  <Plus className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">สร้างกิจกรรม</span>
                </button>
                <button onClick={() => router.push("/eventSchedule")} className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">ปฏิทินกิจกรรม</span>
                </button>
                <button onClick={() => router.push("/profile")} className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">ตั้งค่าโปรไฟล์</span>
                </button>
                {user && user !== false && (
                  <div className="pt-2 border-t border-gray-200">
                    <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 rounded-lg transition text-red-600">
                      <LogOut className="w-5 h-5" />
                      <span className="text-sm font-medium">ออกจากระบบ</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
