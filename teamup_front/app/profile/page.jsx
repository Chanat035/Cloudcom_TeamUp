// app/profile/page.jsx

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";
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
      const response = await fetch(`${API_URL}/api/auth/status`, { credentials: "include" });
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
    } catch {
      window.location.href = `${API_URL}/login`;
    }
  };

  const fetchMyGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/api/myGroups`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMyGroups(data);
      }
    } catch {}
  };

  const fetchProfile = async () => {
    try {
      const [imgRes, intRes] = await Promise.all([
        fetch(`${API_URL}/api/getProfile`, { credentials: "include" }),
        fetch(`${API_URL}/api/settings/getInterests`, { credentials: "include" }),
      ]);
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        if (imgData.imageUrl) setProfileUrl(imgData.imageUrl);
      }
      if (intRes.ok) {
        const intData = await intRes.json();
        setInterests(intData.interests || []);
      }
    } catch {}
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
    } catch {
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
    } catch {}
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
      alert("Password must include:\n- A number\n- A lowercase letter\n- An uppercase letter\n- A symbol");
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
    } catch {}
  };

  const groupsToDisplay = myGroups.slice(0, 2);
  const defaultProfileImageUrl = "https://teamupbucket035.s3.ap-southeast-2.amazonaws.com/user/Default-Profile/user-128.png";

  return (
    <MainLayout>
      <div className="page-bg min-h-[calc(100vh-80px)]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900">โปรไฟล์ของฉัน</h1>
            <p className="mt-2 text-neutral-700">จัดการตัวตน ความสนใจ และกลุ่มที่คุณเข้าร่วม</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-8">
            <section className="card p-6">
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden group">
                <Image
                  src={profileUrl ? profileUrl : defaultProfileImageUrl}
                  alt="Profile Picture"
                  width={720}
                  height={960}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition" />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">รูปโปรไฟล์</h2>
                  <p className="text-sm text-neutral-600">{uploading ? "⏳ กำลังอัปโหลด..." : "อัปโหลดรูปใหม่"}</p>
                </div>
                <label className="btn-outline cursor-pointer">
                  เลือกไฟล์
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="mt-8 border-t border-black/5 pt-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">การตั้งค่า</h3>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setShowNameModal(true)} className="btn-primary">เปลี่ยนชื่อ</button>
                  <button onClick={() => setShowPasswordModal(true)} className="btn-primary">เปลี่ยนรหัสผ่าน</button>
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">ความสนใจ</h2>
                  <button
                    onClick={() => {
                      setSelectedInterests(interests);
                      setShowInterestModal(true);
                    }}
                    className="btn-outline"
                  >
                    แก้ไข
                  </button>
                </div>
                {interests.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {interests.map((item, idx) => (
                      <span key={idx} className="badge">{item}</span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-neutral-500">ยังไม่ได้เลือกความสนใจ</p>
                )}
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">กลุ่มของฉัน</h2>
                  {myGroups.length > 2 && (
                    <button onClick={() => setShowAll(true)} className="btn-outline">ดูทั้งหมด</button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isAuthenticated && (myGroups.length > 0 ? (
                    groupsToDisplay.map((group) => (
                      <div key={group.id} className="rounded-2xl border border-black/10 bg-white p-4 hover:shadow-md transition">
                        <p className="font-semibold text-neutral-900">{group.name}</p>
                        <p className="text-sm text-neutral-600">
                          {new Date(group.startdate).toLocaleDateString()} - {new Date(group.enddate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-neutral-600">{group.location}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-neutral-500 text-sm">ยังไม่มีกลุ่มที่เข้าร่วม</p>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {showAll && (
        <div className="modal">
          <div className="modal-card">
            <button onClick={() => setShowAll(false)} className="modal-close">✕</button>
            <h2 className="text-xl font-bold text-neutral-900 mb-4 text-center">กลุ่มทั้งหมด</h2>
            <ul className="space-y-3">
              {myGroups.map((group) => (
                <li key={group.id} className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="font-semibold text-neutral-900">{group.name}</p>
                  <p className="text-sm text-neutral-600">
                    {new Date(group.startdate).toLocaleDateString()} - {new Date(group.enddate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-neutral-600">{group.location}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showNameModal && (
        <div className="modal">
          <div className="modal-card max-w-md">
            <button onClick={() => setShowNameModal(false)} className="modal-close">✕</button>
            <h2 className="text-xl font-bold text-neutral-900 mb-4">เปลี่ยนชื่อ</h2>
            <input
              type="text"
              placeholder="New Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input"
            />
            <input
              type="password"
              placeholder="Password"
              value={namePassword}
              onChange={(e) => setNamePassword(e.target.value)}
              className="input mt-3"
            />
            <button onClick={handleChangeName} className="btn-primary mt-4 w-full">ยืนยัน</button>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal">
          <div className="modal-card max-w-md">
            <button onClick={() => setShowPasswordModal(false)} className="modal-close">✕</button>
            <h2 className="text-xl font-bold text-neutral-900 mb-4">เปลี่ยนรหัสผ่าน</h2>
            <input
              type="password"
              placeholder="Old Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="input"
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input mt-3"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input mt-3"
            />
            <p className="text-sm text-neutral-600 mt-3">
              Password must be at least 8 characters และต้องมี ตัวเลข, ตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่, สัญลักษณ์
            </p>
            <button onClick={handleChangePassword} className="btn-primary mt-4 w-full">ยืนยัน</button>
          </div>
        </div>
      )}

      {showInterestModal && (
        <div className="modal">
          <div className="modal-card max-w-md">
            <button onClick={() => setShowInterestModal(false)} className="modal-close">✕</button>
            <h2 className="text-xl font-bold text-neutral-900 mb-4">เลือกความสนใจ (สูงสุด 3)</h2>
            <div className="flex flex-wrap gap-2">
              {[
                "กีฬา",
                "ศิลปะและวัฒนธรรม",
                "การศึกษา",
                "เทคโนโลยี",
                "สุขภาพและความงาม",
                "ธุรกิจและการตลาด",
                "การท่องเที่ยว",
                "อาสาสมัครและการกุศล",
              ].map((option) => {
                const checked = selectedInterests.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => {
                      if (checked) {
                        setSelectedInterests(selectedInterests.filter((i) => i !== option));
                      } else if (selectedInterests.length < 3) {
                        setSelectedInterests([...selectedInterests, option]);
                      } else {
                        alert("เลือกได้สูงสุด 3 อย่าง");
                      }
                    }}
                    className={`badge-select ${checked ? "badge-select-active" : ""}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <button
              onClick={async () => {
                const res = await fetch(`${API_URL}/api/settings/changeInterests`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ interests: selectedInterests }),
                });
                const data = await res.json();
                if (res.ok) {
                  setInterests(data.interests);
                  setShowInterestModal(false);
                } else {
                  alert(data.error || "บันทึกไม่สำเร็จ");
                }
              }}
              className="btn-primary mt-5 w-full"
            >
              บันทึก
            </button>
          </div>
        </div>
      )}

      <StyleBlock />
    </MainLayout>
  );
};

export default ProfilePage;

function StyleBlock() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@300;400;500;600;700&display=swap');
      html, body { font-family: 'IBM Plex Sans Thai Looped', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans Thai', sans-serif; }

      .page-bg{
        --c1:#FFF3E9; --c2:#FFFDF9; --c3:#FFE7D6;
        background: radial-gradient(1200px 600px at 15% -10%, var(--c3) 0, var(--c2) 45%, var(--c1) 70%);
        background-size: 160% 160%;
        animation: bgShift 24s ease-in-out infinite;
      }
      @keyframes bgShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

      .card{
        border-radius: 24px;
        background: rgba(255,255,255,.94);
        border: 1px solid rgba(0,0,0,.05);
        backdrop-filter: blur(6px);
        box-shadow: 0 10px 28px rgba(0,0,0,.06);
      }

      .btn-primary{
        display:inline-flex; align-items:center; justify-content:center;
        padding:.7rem 1.1rem; border-radius:14px; color:#fff;
        background: linear-gradient(120deg,#FF944D,#E35205);
        box-shadow:0 10px 24px rgba(227,82,5,.28);
        transition:transform .15s ease, filter .2s ease, box-shadow .2s ease;
      }
      .btn-primary:hover{ filter:brightness(.98); box-shadow:0 14px 30px rgba(227,82,5,.38) }
      .btn-primary:active{ transform:scale(.98) }

      .btn-outline{
        display:inline-flex; align-items:center; justify-content:center;
        padding:.6rem 1rem; border-radius:14px; font-weight:600;
        color:#E35205; background:#fff; border:1px solid rgba(227,82,5,.35);
        transition:background .2s ease, box-shadow .2s ease, transform .1s ease;
      }
      .btn-outline:hover{ background:#FFF3EA; box-shadow:0 6px 18px rgba(227,82,5,.18) }

      .badge{
        display:inline-block; border-radius:9999px;
        padding:.35rem .8rem; font-size:.8rem; font-weight:600;
        color:#E35205; background:rgba(227,82,5,.12); border:1px solid rgba(227,82,5,.3);
      }

      .badge-select{
        border-radius:9999px; padding:.5rem 1rem; font-weight:600; font-size:.9rem;
        color:#E35205; background:#fff; border:1px solid rgba(227,82,5,.35);
        transition: all .2s ease;
      }
      .badge-select:hover{ background:#FFF3EA }
      .badge-select-active{ color:#fff; background:#E35205; border-color:#E35205 }

      .input{
        width:100%; padding:.75rem 1rem; border-radius:14px; border:1px solid rgba(0,0,0,.1);
        background:#fff; color:#111827; outline: none;
      }
      .input:focus{ box-shadow:0 0 0 2px rgba(227,82,5,.2) }

      .modal{
        position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
        background:rgba(17,24,39,.4); z-index:50; padding:1rem;
      }
      .modal-card{
        width:100%; max-width:36rem; border-radius:20px; background:rgba(255,255,255,.96);
        border:1px solid rgba(0,0,0,.06); box-shadow:0 20px 50px rgba(0,0,0,.2);
        padding:1.25rem 1.25rem 1.5rem; position:relative;
        animation:fadeUp .4s both;
      }
      .modal-close{
        position:absolute; top:.6rem; right:.6rem; width:2rem; height:2rem;
        display:flex; align-items:center; justify-content:center;
        border-radius:9999px; background:#FFF3EA; color:#E35205;
        border:1px solid rgba(227,82,5,.35);
      }
      .modal-close:hover{ filter:brightness(.98) }

      @keyframes fadeUp { from{opacity:0; transform: translateY(8px)} to{opacity:1; transform: translateY(0)} }
    `}</style>
  );
}
