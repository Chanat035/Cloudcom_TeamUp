"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  API_URL,
  FRONTEND_URL,
  COGNITO_DOMAIN,
  COGNITO_CLIENT_ID,
  OAUTH_REDIRECT_URI,
} from "@/lib/config";
import MainLayout from "../component/MainLayout.jsx";

const ProfilePage = () => {
  const [myGroups, setMyGroups] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [profileUrl, setProfileUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);

  const [newName, setNewName] = useState("");
  const [namePassword, setNamePassword] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [interests, setInterests] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);

  useEffect(() => {
    checkAuthStatus();
    fetchProfile();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/status`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (!data.isAuthenticated) {
          window.location.href = `${API_URL}/login`;
          return;
        }
        setIsAuthenticated(true);
        fetchMyGroups();
      } else {
        window.location.href = `${API_URL}/login`;
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      window.location.href = `${API_URL}/login`;
    }
  };

  const fetchMyGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/api/myGroups`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMyGroups(data);
      }
    } catch (err) {
      console.error("Error fetching my groups:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const [imgRes, intRes] = await Promise.all([
        fetch(`${API_URL}/api/getProfile`, { credentials: "include" }),
        fetch(`${API_URL}/api/settings/getInterests`, {
          credentials: "include",
        }),
      ]);

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        if (imgData.imageUrl) setProfileUrl(imgData.imageUrl);
      }

      if (intRes.ok) {
        const intData = await intRes.json();
        setInterests(intData.interests || []);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("profileImage", file);
    try {
      const res = await fetch(`${API_URL}/api/uploadProfile`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setProfileUrl(data.imageUrl);
        alert("อัปโหลดสำเร็จ!");
      } else {
        alert(data.error || "Upload ล้มเหลว");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
      setUploading(false);
    }
  };

  const handleChangeName = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/changeName`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newName, password: namePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("อัปเดตชื่อสำเร็จ!");
        setShowNameModal(false);
        setNewName("");
        setNamePassword("");
      } else {
        alert(data.error || "Update name failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    const hasNumber = /\d/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasNumber || !hasLower || !hasUpper || !hasSymbol) {
      alert(
        "Password must include:\n- A number\n- A lowercase letter\n- An uppercase letter\n- A symbol"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirmation do not match");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/settings/changePassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("เปลี่ยนรหัสผ่านสำเร็จ!");
        setShowPasswordModal(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(data.error || "Change password failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const groupsToDisplay = myGroups.slice(0, 1);
  const defaultProfileImageUrl =
    "https://teamupbucket035.s3.ap-southeast-2.amazonaws.com/user/Default-Profile/user-128.png";

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl bg-white/90 backdrop-blur border border-black/5 shadow-[0_12px_30px_rgba(0,0,0,.06)] p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex flex-col md:border-r md:pr-8 border-black/5">
                <div className="w-full">
                  <div className="relative w-56 h-56 rounded-2xl overflow-hidden border border-orange-100 shadow-[0_10px_26px_rgba(0,0,0,.06)]">
                    <Image
                      src={profileUrl ? profileUrl : defaultProfileImageUrl}
                      alt="Profile Picture"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <h1 className="mt-6 text-2xl font-bold text-neutral-900">
                    รูปโปรไฟล์
                  </h1>
                  <label className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer bg-white border border-black/10 text-neutral-800 shadow-[0_6px_16px_rgba(0,0,0,.05)] hover:bg-neutral-50 transition">
                    {uploading ? "⏳ กำลังอัปโหลด..." : "อัปโหลดรูปภาพ"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="mt-10">
                    <h2 className="text-2xl font-bold text-neutral-900">
                      ความสนใจของฉัน
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {interests.length > 0 ? (
                        interests.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex px-3 py-1 rounded-full text-sm font-medium text-[#E35205] bg-[#FFE7D6] border border-[#E35205]/30"
                          >
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-neutral-500">ไม่มี</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedInterests(interests);
                        setShowInterestModal(true);
                      }}
                      className="mt-4 inline-flex px-4 py-2 rounded-xl bg-[#E35205] text-white shadow-[0_10px_24px_rgba(227,82,5,.35)] hover:brightness-95 transition"
                    >
                      เลือกความสนใจ
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <section>
                  <h2 className="text-2xl font-bold text-neutral-900 text-right">
                    กลุ่มของฉัน
                  </h2>
                  <div className="mt-4">
                    {isAuthenticated &&
                      (myGroups.length > 0 ? (
                        <>
                          <ul className="space-y-3">
                            {groupsToDisplay.map((group) => (
                              <li
                                key={group.id}
                                className="p-4 bg-white rounded-2xl border border-black/5 shadow-[0_8px_22px_rgba(0,0,0,.06)] text-right"
                              >
                                <p className="font-semibold text-neutral-900">
                                  {group.name}
                                </p>
                                <p className="text-sm text-neutral-600">
                                  {new Date(
                                    group.startdate
                                  ).toLocaleDateString()}{" "}
                                  -{" "}
                                  {new Date(
                                    group.enddate
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-neutral-600">
                                  {group.location}
                                </p>
                              </li>
                            ))}
                          </ul>
                          {myGroups.length > 1 && (
                            <button
                              onClick={() => setShowAll(true)}
                              className="mt-3 px-4 py-2 bg-white border border-black/10 rounded-xl shadow-[0_6px_16px_rgba(0,0,0,.05)] hover:bg-neutral-50"
                            >
                              อื่นๆ
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-neutral-500 text-sm text-right">
                          ยังไม่มีกลุ่ม
                        </p>
                      ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-neutral-900 text-right">
                    การตั้งค่า
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-3 justify-end">
                    <button
                      onClick={() => setShowNameModal(true)}
                      className="px-4 py-2 rounded-xl bg-white border border-black/10 text-neutral-900 shadow-[0_6px_16px_rgba(0,0,0,.05)] hover:bg-neutral-50"
                    >
                      เปลี่ยนชื่อ
                    </button>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="px-4 py-2 rounded-xl bg-[#16a34a] text-white shadow-[0_10px_24px_rgba(22,163,74,.35)] hover:brightness-95"
                    >
                      เปลี่ยนรหัสผ่าน
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: My Groups */}
        {showAll && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.2)] w-11/12 max-w-lg p-6 relative">
              <button
                onClick={() => setShowAll(false)}
                className="absolute top-3 right-3 text-neutral-500 hover:text-black"
              >
                ✕
              </button>
              <h2 className="text-2xl text-neutral-900 font-bold mb-4 text-center">
                กลุ่มของฉัน
              </h2>
              <ul className="space-y-3">
                {myGroups.map((group) => (
                  <li
                    key={group.id}
                    className="p-4 bg-neutral-50 rounded-xl border border-black/5 text-right"
                  >
                    <p className="font-semibold text-neutral-900">
                      {group.name}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {new Date(group.startdate).toLocaleDateString()} -{" "}
                      {new Date(group.enddate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-neutral-600">{group.location}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Modal: เปลี่ยนชื่อ */}
        {showNameModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-96 relative shadow-[0_20px_60px_rgba(0,0,0,.2)]">
              <button
                onClick={() => setShowNameModal(false)}
                className="absolute top-3 right-3 text-neutral-500 hover:text-black"
              >
                ✕
              </button>
              <h2 className="text-xl text-neutral-900 font-bold mb-4">
                เปลี่ยนชื่อ
              </h2>
              <input
                type="text"
                placeholder="New Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border border-black/10 p-2 rounded-xl w-full mb-3 text-neutral-900"
              />
              <input
                type="password"
                placeholder="Password"
                value={namePassword}
                onChange={(e) => setNamePassword(e.target.value)}
                className="border border-black/10 p-2 rounded-xl w-full mb-4 text-neutral-900"
              />
              <button
                onClick={handleChangeName}
                className="px-4 py-2 bg-[#E35205] text-white rounded-xl w-full shadow-[0_10px_24px_rgba(227,82,5,.35)] hover:brightness-95"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        )}

        {/* Modal: เปลี่ยนรหัสผ่าน */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-96 relative shadow-[0_20px_60px_rgba(0,0,0,.2)]">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-3 right-3 text-neutral-500 hover:text-black"
              >
                ✕
              </button>
              <h2 className="text-xl text-neutral-900 font-bold mb-4">
                เปลี่ยนรหัสผ่าน
              </h2>
              <input
                type="password"
                placeholder="Old Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="border border-black/10 p-2 rounded-xl w-full mb-3 text-neutral-900"
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border border-black/10 p-2 rounded-xl w-full mb-3 text-neutral-900"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border border-black/10 p-2 rounded-xl w-full mb-4 text-neutral-900"
              />
              <p className="text-sm text-neutral-600 mb-4 text-left leading-5">
                Password must be at least 8 characters
                <br />• Use a number
                <br />• Use a lowercase letter
                <br />• Use an uppercase letter
                <br />• Use a symbol
              </p>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-[#16a34a] text-white rounded-xl w-full shadow-[0_10px_24px_rgba(22,163,74,.35)] hover:brightness-95"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        )}

        {/* Modal: เลือก interests */}
        {showInterestModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-96 relative shadow-[0_20px_60px_rgba(0,0,0,.2)]">
              <button
                onClick={() => setShowInterestModal(false)}
                className="absolute top-3 right-3 text-neutral-500 hover:text-black"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4 text-neutral-900">
                เลือกความสนใจ (สูงสุด 3)
              </h2>
              <div className="space-y-2 text-neutral-900">
                {[
                  "กีฬา",
                  "ศิลปะและวัฒนธรรม",
                  "การศึกษา",
                  "เทคโนโลยี",
                  "สุขภาพและความงาม",
                  "ธุรกิจและการตลาด",
                  "การท่องเที่ยว",
                  "อาสาสมัครและการกุศล",
                ].map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedInterests.includes(option)}
                      onChange={() => {
                        if (selectedInterests.includes(option)) {
                          setSelectedInterests(
                            selectedInterests.filter((i) => i !== option)
                          );
                        } else if (selectedInterests.length < 3) {
                          setSelectedInterests([
                            ...selectedInterests,
                            option,
                          ]);
                        } else {
                          alert("เลือกได้สูงสุด 3 อย่าง");
                        }
                      }}
                      className="mr-2 accent-[#E35205]"
                    />
                    {option}
                  </label>
                ))}
              </div>
              <button
                onClick={async () => {
                  const res = await fetch(
                    `${API_URL}/api/settings/changeInterests`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ interests: selectedInterests }),
                    }
                  );
                  const data = await res.json();
                  if (res.ok) {
                    setInterests(data.interests);
                    setShowInterestModal(false);
                  } else {
                    alert(data.error || "บันทึกไม่สำเร็จ");
                  }
                }}
                className="mt-4 px-4 py-2 bg-[#E35205] text-white rounded-xl w-full shadow-[0_10px_24px_rgba(227,82,5,.35)] hover:brightness-95"
              >
                บันทึก
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&display=swap');
        html, body { font-family: 'IBM Plex Sans Thai Looped', system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif; }
      `}</style>
    </MainLayout>
  );
};

export default ProfilePage;
