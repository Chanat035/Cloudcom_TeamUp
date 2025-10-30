// app/createActivity/page.jsx
"use client";

import React, { useState, useEffect } from "react";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import { API_URL } from "@/lib/config";
import Header from "../component/header.jsx";

export default function CreateActivityPage() {
  const [formData, setFormData] = useState({
    activityName: "",
    category: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    signUpDeadline: "",
    signUpDeadlineTime: "",
    description: "",
    location: "",
  });

  const [activityImage, setActivityImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [userInfo, setUserInfo] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const categories = ["กีฬา","ศิลปะและวัฒนธรรม","การศึกษา","เทคโนโลยี","สุขภาพและความงาม","ธุรกิจและการตลาด","การท่องเที่ยว","อาสาสมัครและการกุศล","อื่นๆ"];

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/status`, { credentials: "include" });
      const data = await response.json();
      if (!data?.isAuthenticated) {
        window.location.href = `${API_URL}/login`;
        return;
      }
      setUserInfo(data.userInfo);
    } catch (error) {
      console.error("Auth check failed:", error);
      window.location.href = `${API_URL}/login`;
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e) => {
    setActivityImage(e.target.files[0]);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.activityName.trim()) newErrors.activityName = "กรุณากรอกชื่อกิจกรรม";
    if (!formData.category) newErrors.category = "กรุณาเลือกหมวดหมู่";
    if (!formData.startDate) newErrors.startDate = "กรุณาเลือกวันที่เริ่มต้น";
    if (!formData.endDate) newErrors.endDate = "กรุณาเลือกวันที่สิ้นสุด";
    if (!formData.signUpDeadline) newErrors.signUpDeadline = "กรุณาเลือกวันที่ปิดรับสมัคร";
    if (!formData.description.trim()) newErrors.description = "กรุณากรอกรายละเอียดกิจกรรม";
    if (!formData.location.trim()) newErrors.location = "กรุณากรอกสถานที่";

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = "วันสิ้นสุดต้องมาหลังวันเริ่มต้น";
    }
    if (formData.signUpDeadline && formData.startDate && formData.signUpDeadline > formData.startDate) {
      newErrors.signUpDeadline = "วันปิดรับสมัครต้องมาก่อนวันเริ่มกิจกรรม";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const activityPayload = {
        name: formData.activityName,
        owner: userInfo?.sub || "anonymous",
        category: formData.category,
        startDate: formData.startDate ? `${formData.startDate}T${formData.startTime || "00:00"}` : null,
        endDate: formData.endDate ? `${formData.endDate}T${formData.endTime || "23:59"}` : null,
        signUpDeadline: formData.signUpDeadline ? `${formData.signUpDeadline}T${formData.signUpDeadlineTime || "23:59"}` : null,
        description: formData.description,
        location: formData.location,
      };

      const createActivityResponse = await fetch(`${API_URL}/api/createActivity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityPayload),
        credentials: "include",
      });

      if (!createActivityResponse.ok) {
        const errorData = await createActivityResponse.json();
        throw new Error(errorData.error || "Failed to create activity");
      }

      const result = await createActivityResponse.json();
      const activityId = result.id;

      if (activityImage) {
        const imageFormData = new FormData();
        imageFormData.append("activityImage", activityImage);

        const uploadResponse = await fetch(`${API_URL}/api/uploadActivityImage/${activityId}`, {
          method: "POST",
          body: imageFormData,
          credentials: "include",
        });

        if (!uploadResponse.ok) throw new Error("Failed to upload image.");
      }

      alert("สร้างกิจกรรมสำเร็จ! 🎉");
      setFormData({ activityName: "", category: "", startDate: "", startTime: "", endDate: "", endTime: "", signUpDeadline: "", signUpDeadlineTime: "", description: "", location: "" });
      setActivityImage(null);
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการสร้างกิจกรรม: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ activityName: "", category: "", startDate: "", startTime: "", endDate: "", endTime: "", signUpDeadline: "", signUpDeadlineTime: "", description: "", location: "" });
    setActivityImage(null);
    setErrors({});
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  if (loadingAuth) return <div className="p-6 text-center">กำลังตรวจสอบสถานะการล็อกอิน...</div>;

  return (
    <div>
      {/* Header เรียก auth เอง */}
      <Header />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* ... (rest of your form UI unchanged) */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">สร้างกิจกรรมใหม่</h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">กรอกข้อมูลกิจกรรมของคุณให้ครบถ้วน</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden p-8 md:p-12 space-y-6">
            {/* ตัวอย่างฟิลด์ชื่อกิจกรรม */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">ชื่อกิจกรรม *</label>
              <input type="text" name="activityName" value={formData.activityName} onChange={handleInputChange} className={`w-full px-6 py-4 rounded-2xl border-2 focus:outline-none ${errors.activityName ? "border-red-400 bg-red-50" : "border-gray-200"}`} placeholder="ใส่ชื่อกิจกรรมที่น่าสนใจ" />
              {errors.activityName && <p className="text-red-500 text-sm mt-2">⚠️ {errors.activityName}</p>}
            </div>

            {/* ใส่ฟิลด์อื่น ๆ ตามของเดิม */}
            <div className="flex gap-4">
              <button type="submit" disabled={isLoading} className={`flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}>{isLoading ? "⏳ กำลังบันทึก..." : "🎉 บันทึกกิจกรรม"}</button>
              <button type="button" onClick={handleReset} disabled={isLoading} className="flex-none bg-gray-100 text-gray-700 px-6 py-4 rounded-2xl font-bold">🔄 ล้างข้อมูล</button>
            </div>
          </form>

          {/* Summary card (ถ้ามี) */}
        </div>
      </div>
    </div>
  );
}
