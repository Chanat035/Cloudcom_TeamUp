// createActivity

"use client";

import React, { useState, useEffect } from "react";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";
import MainLayout from "@/components/MainLayout";

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

  const categories = [
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/status`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!data.isAuthenticated) {
        window.location.href = `${API_URL}/login`;
        return;
      }

      setUserInfo(data.userInfo);
    } catch (error) {
      console.error("Auth check failed:", error);
      window.location.href = `${API_URL}/login`;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleFileChange = (e) => {
    setActivityImage(e.target.files[0]);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.activityName.trim())
      newErrors.activityName = "กรุณากรอกชื่อกิจกรรม";
    if (!formData.category) newErrors.category = "กรุณาเลือกหมวดหมู่";
    if (!formData.startDate) newErrors.startDate = "กรุณาเลือกวันที่เริ่มต้น";
    if (!formData.endDate) newErrors.endDate = "กรุณาเลือกวันที่สิ้นสุด";
    if (!formData.signUpDeadline)
      newErrors.signUpDeadline = "กรุณาเลือกวันที่ปิดรับสมัคร";
    if (!formData.description.trim())
      newErrors.description = "กรุณากรอกรายละเอียดกิจกรรม";
    if (!formData.location.trim()) newErrors.location = "กรุณากรอกสถานที่";

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      newErrors.endDate = "วันสิ้นสุดต้องมาหลังวันเริ่มต้น";
    }

    if (
      formData.signUpDeadline &&
      formData.startDate &&
      formData.signUpDeadline > formData.startDate
    ) {
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
        startDate: formData.startDate
          ? `${formData.startDate}T${formData.startTime || "00:00"}`
          : null,
        endDate: formData.endDate
          ? `${formData.endDate}T${formData.endTime || "23:59"}`
          : null,
        signUpDeadline: formData.signUpDeadline
          ? `${formData.signUpDeadline}T${
              formData.signUpDeadlineTime || "23:59"
            }`
          : null,
        description: formData.description,
        location: formData.location,
      };

      const createActivityResponse = await fetch(
        `${API_URL}/api/createActivity`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityPayload),
          credentials: "include",
        }
      );

      if (!createActivityResponse.ok) {
        const errorData = await createActivityResponse.json();
        throw new Error(errorData.error || "Failed to create activity");
      }

      const result = await createActivityResponse.json();
      const activityId = result.id;

      if (activityImage) {
        const imageFormData = new FormData();
        imageFormData.append("activityImage", activityImage);

        const uploadResponse = await fetch(
          `${API_URL}/api/uploadActivityImage/${activityId}`,
          {
            method: "POST",
            body: imageFormData,
            credentials: "include",
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image.");
        }
      }

      alert("สร้างกิจกรรมสำเร็จ! 🎉");
      console.log("Created activity with ID:", activityId);

      setFormData({
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
      setActivityImage(null);
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการสร้างกิจกรรม: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
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

  if (!userInfo) {
    return <div>กำลังโหลด...</div>;
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* User Info */}
        <div className="text-right mb-4">
          <span className="text-sm text-gray-600">
            ผู้ใช้: {userInfo.name || "ไม่ระบุ"} |
            <a
              href={`${API_URL}/logout`}
              className="ml-2 text-blue-600 hover:underline"
            >
              ออกจากระบบ
            </a>
          </span>
        </div>

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            สร้างกิจกรรมใหม่
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            กรอกข้อมูลกิจกรรมของคุณให้ครบถ้วน
            เพื่อให้ผู้สนใจได้รับทราบรายละเอียดที่ชัดเจน
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="space-y-8">
              {/* Activity Name */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  ชื่อกิจกรรม *
                </label>
                <input
                  type="text"
                  name="activityName"
                  value={formData.activityName}
                  onChange={handleInputChange}
                  className={`w-full px-6 py-4 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/20 placeholder-gray-400 text-black ${
                    errors.activityName
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 focus:border-purple-400 bg-white"
                  }`}
                  placeholder="ใส่ชื่อกิจกรรมที่น่าสนใจ"
                />
                {errors.activityName && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <span className="mr-1">⚠️</span> {errors.activityName}
                  </p>
                )}
              </div>

              {/* ... (existing fields) */}

              {/* New: Activity Image */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  รูปภาพกิจกรรม
                </label>
                <input
                  type="file"
                  name="activityImage"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={`w-full px-6 py-4 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/20 placeholder-gray-400 text-black border-gray-200 focus:border-purple-400 bg-white`}
                />
              </div>

              {/* Category and Location Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    หมวดหมู่ *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-6 py-4 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/20  placeholder-gray-400 text-black ${
                      errors.category
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 focus:border-purple-400 bg-white"
                    }`}
                  >
                    <option value="">เลือกหมวดหมู่กิจกรรม</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    สถานที่ *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className={`w-full px-6 py-4 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/20 placeholder-gray-400 text-black ${
                      errors.location
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 focus:border-purple-400 bg-white"
                    }`}
                    placeholder="สถานที่จัดกิจกรรม"
                  />
                  {errors.location && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <span className="mr-1">⚠️</span> {errors.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Start Date + Time */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    วันที่เริ่มต้น *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 text-black rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20"
                  />
                  <TimePicker
                    onChange={(value) =>
                      handleInputChange({
                        target: { name: "startTime", value: value || "" },
                      })
                    }
                    value={formData.startTime || ""}
                    disableClock
                    format="HH:mm"
                    clearIcon={null}
                    className="custom-timepicker w-full mt-2"
                  />
                </div>

                {/* End Date + Time */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    วันที่สิ้นสุด *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 text-black rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20"
                  />
                  <TimePicker
                    onChange={(value) =>
                      handleInputChange({
                        target: { name: "endTime", value: value || "" },
                      })
                    }
                    value={formData.endTime || ""}
                    disableClock
                    format="HH:mm"
                    clearIcon={null}
                    className="custom-timepicker w-full mt-2"
                  />
                </div>

                {/* SignUp Deadline + Time */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    วันปิดรับสมัคร *
                  </label>
                  <input
                    type="date"
                    name="signUpDeadline"
                    value={formData.signUpDeadline}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 text-black rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20"
                  />
                  <TimePicker
                    onChange={(value) =>
                      handleInputChange({
                        target: {
                          name: "signUpDeadlineTime",
                          value: value || "",
                        },
                      })
                    }
                    value={formData.signUpDeadlineTime || ""}
                    disableClock
                    format="HH:mm"
                    clearIcon={null}
                    className="custom-timepicker w-full mt-2"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  รายละเอียดกิจกรรม *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="6"
                  className={`w-full px-6 py-4 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/20 resize-none placeholder-gray-400 text-black ${
                    errors.description
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 focus:border-purple-400 bg-white"
                  }`}
                  placeholder="บรรยายรายละเอียดกิจกรรม วัตถุประสงค์ กิจกรรมที่จะทำ และข้อมูลสำคัญอื่นๆ..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <span className="mr-1">⚠️</span> {errors.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className={`flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 hover:shadow-xl transition-all duration-300 ${
                    isLoading
                      ? "opacity-50 cursor-not-allowed transform-none"
                      : ""
                  }`}
                >
                  {isLoading ? "⏳ กำลังบันทึก..." : "🎉 บันทึกกิจกรรม"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className={`flex-none bg-gray-100 text-gray-700 px-8 py-4 rounded-2xl font-bold hover:bg-gray-200 hover:shadow-lg transition-all duration-300 ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  🔄 ล้างข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        {(formData.activityName || formData.category || formData.location) && (
          <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              📝 ข้อมูลที่กรอก
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3 text-black">
                <div>
                  <strong>ชื่อกิจกรรม:</strong> {formData.activityName || "-"}
                </div>
                <div>
                  <strong>หมวดหมู่:</strong> {formData.category || "-"}
                </div>
                <div>
                  <strong>สถานที่:</strong> {formData.location || "-"}
                </div>
                <div>
                  <strong>รายละเอียด:</strong>{" "}
                  {formData.description
                    ? `${formData.description.substring(0, 50)}...`
                    : "-"}
                </div>
              </div>
              <div className="space-y-3 text-black">
                <div>
                  <strong>วันที่ปิดรับสมัคร:</strong>{" "}
                  {formatDate(
                    formData.signUpDeadline + "T" + formData.signUpDeadlineTime
                  )}
                </div>
                <div>
                  <strong>วันที่เริ่มต้น:</strong>{" "}
                  {formatDate(formData.startDate + "T" + formData.startTime)}
                </div>
                <div>
                  <strong>วันที่สิ้นสุด:</strong>{" "}
                  {formatDate(formData.endDate + "T" + formData.endTime)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </MainLayout>
  );
}
