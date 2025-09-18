"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

const ProfilePage = () => {
  const [myGroups, setMyGroups] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // 🆕 state สำหรับรูปโปรไฟล์
  const [profileUrl, setProfileUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    fetchProfileImage();
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

  // 🆕 อัปโหลดรูปโปรไฟล์
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

  const fetchProfileImage = async () => {
  try {
    const res = await fetch("http://localhost:3100/api/getProfile", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl) {
        setProfileUrl(data.imageUrl);
      }
    }
  } catch (err) {
    console.error("Error fetching profile image:", err);
  }
};

  const groupsToDisplay = myGroups.slice(0, 1);

  const defaultProfileImageUrl = "https://teamupbucket035.s3.ap-southeast-2.amazonaws.com/user/Default-Profile/user-128.png";

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
            <p className="mt-2 text-gray-600">The New Yorker</p>
            <p className="text-gray-600">The New York Times</p>
            <p className="text-gray-600">I-D Magazine</p>
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

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-black">
              SETTINGS
            </h2>
          </div>
        </div>
      </div>

      {/* Modal แสดงกลุ่มทั้งหมด */}
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
    </div>
  );
};

export default ProfilePage;
