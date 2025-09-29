"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

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
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // 🆕 state สำหรับ interests
  const [interests, setInterests] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);

  useEffect(() => {
    checkAuthStatus();
    fetchProfile();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("http://localhost:3100/api/auth/status", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (!data.isAuthenticated) {
          window.location.href = "http://localhost:3100/login";
          return;
        }
        setIsAuthenticated(true);
        fetchMyGroups();
      } else {
        window.location.href = "http://localhost:3100/login";
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      window.location.href = "http://localhost:3100/login";
    }
  };

  const fetchMyGroups = async () => {
    try {
      const res = await fetch("http://localhost:3100/api/myGroups", {
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

  // ✅ ดึง profile image + interests
  const fetchProfile = async () => {
    try {
      const [imgRes, intRes] = await Promise.all([
        fetch("http://localhost:3100/api/getProfile", {
          credentials: "include",
        }),
        fetch("http://localhost:3100/api/settings/getInterests", {
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
      const res = await fetch("http://localhost:3100/api/uploadProfile", {
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
      const res = await fetch("http://localhost:3100/api/settings/changeName", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newName }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("อัปเดตชื่อสำเร็จ!");
        setShowNameModal(false);
        setNewName("");
      } else {
        alert(data.error || "Update name failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch(
        "http://localhost:3100/api/settings/changePassword",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ oldPassword, newPassword }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert("เปลี่ยนรหัสผ่านสำเร็จ!");
        setShowPasswordModal(false);
        setOldPassword("");
        setNewPassword("");
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
    <div className="flex min-h-screen bg-gray-100 p-8 font-sans">
      <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto">
        {/* Left Section */}
        <div className="flex-1 flex flex-col items-start p-4">
          <div className="mb-4">
            <Image
              src={profileUrl ? profileUrl : defaultProfileImageUrl}
              alt="Profile Picture"
              width={250}
              height={350}
              className="object-cover rounded-lg"
            />
          </div>
          <div className="mt-8">
            <h1 className="text-4xl font-bold tracking-tight text-black">
              PROFILE PICTURE
            </h1>
            <label className="mt-2 cursor-pointer text-gray-500 hover:text-gray-700 transition-colors">
              {uploading ? "⏳ กำลังอัปโหลด..." : "Upload"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex-1 flex flex-col justify-end items-end p-4 text-right">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-black">
              INTERESTS
            </h2>
            {interests.length > 0 ? (
              interests.map((item, idx) => (
                <p key={idx} className="text-gray-600">
                  {item}
                </p>
              ))
            ) : (
              <p className="text-gray-500">ไม่มี</p>
            )}
            <button
              onClick={() => {
                setSelectedInterests(interests);
                setShowInterestModal(true);
              }}
              className="mt-3 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              เลือกความสนใจ
            </button>
          </div>

          <div className="mb-8 w-full">
            <h2 className="text-3xl font-bold tracking-tight text-black text-right">
              MY GROUPS
            </h2>
            <div className="mt-4">
              {isAuthenticated &&
                (myGroups.length > 0 ? (
                  <>
                    <ul className="space-y-2">
                      {groupsToDisplay.map((group) => (
                        <li
                          key={group.id}
                          className="p-3 bg-white rounded shadow text-right"
                        >
                          <p className="font-semibold text-black">
                            {group.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(group.startdate).toLocaleDateString()} -{" "}
                            {new Date(group.enddate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {group.location}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {myGroups.length > 1 && (
                      <button
                        onClick={() => setShowAll(true)}
                        className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        อื่นๆ
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">No groups yet</p>
                ))}
            </div>
          </div>

          {/* SETTINGS */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-black">
              SETTINGS
            </h2>
            <div className="mt-4 space-y-3">
              <button
                onClick={() => setShowNameModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                เปลี่ยนชื่อ
              </button>
              <div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal My Groups */}
      {showAll && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-lg p-6 relative">
            <button
              onClick={() => setShowAll(false)}
              className="absolute top-2 right-2 text-black hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-2xl text-black font-bold mb-4 text-center">
              My Groups
            </h2>
            <ul className="space-y-3">
              {myGroups.map((group) => (
                <li
                  key={group.id}
                  className="p-3 bg-gray-100 rounded shadow-sm text-right"
                >
                  <p className="font-semibold text-black">{group.name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(group.startdate).toLocaleDateString()} -{" "}
                    {new Date(group.enddate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">{group.location}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modal เปลี่ยนชื่อ */}
      {showNameModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 relative">
            <button
              onClick={() => setShowNameModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>
            <h2 className="text-xl text-black font-bold mb-4">เปลี่ยนชื่อ</h2>
            <input
              type="text"
              placeholder="New Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border p-2 rounded w-full mb-4 text-black"
            />
            <button
              onClick={handleChangeName}
              className="px-4 py-2 bg-blue-500 text-white rounded w-full"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      )}

      {/* Modal เปลี่ยนรหัสผ่าน */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 relative">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>
            <h2 className="text-xl text-black font-bold mb-4">เปลี่ยนรหัสผ่าน</h2>
            <input
              type="password"
              placeholder="Old Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="border p-2 rounded w-full mb-3 text-black"
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border p-2 rounded w-full mb-4 text-black"
            />
            <button
              onClick={handleChangePassword}
              className="px-4 py-2 bg-green-500 text-white rounded w-full"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      )}

      {/* Modal เลือก interests */}
      {showInterestModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 relative">
            <button
              onClick={() => setShowInterestModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 text-black">
              เลือกความสนใจ (สูงสุด 3)
            </h2>
            <div className="space-y-2 text-black">
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
                        setSelectedInterests([...selectedInterests, option]);
                      } else {
                        alert("เลือกได้สูงสุด 3 อย่าง");
                      }
                    }}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
            <button
              onClick={async () => {
                const res = await fetch(
                  "http://localhost:3100/api/settings/changeInterests",
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
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded w-full"
            >
              บันทึก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;