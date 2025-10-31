// app/createActivity/page.jsx

"use client";

import React, { useState, useEffect } from "react";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import {
  API_URL,
  FRONTEND_URL,
  COGNITO_DOMAIN,
  COGNITO_CLIENT_ID,
  OAUTH_REDIRECT_URI,
} from "@/lib/config";
import MainLayout from "../component/MainLayout.jsx";

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
    return <div className="p-6 text-neutral-700">กำลังโหลด...</div>;
  }

  return (
    <MainLayout>
      <div className="page-bg min-h-[calc(100vh-80px)]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900">
              สร้างกิจกรรมใหม่
            </h1>
            <p className="mt-2 text-neutral-700">
              กรอกข้อมูลกิจกรรมของคุณให้ครบถ้วน เพื่อให้เพื่อน ๆ ค้นหาและเข้าร่วมได้ง่าย
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
            <section className="card p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    ชื่อกิจกรรม *
                  </label>
                  <input
                    type="text"
                    name="activityName"
                    value={formData.activityName}
                    onChange={handleInputChange}
                    placeholder="ใส่ชื่อกิจกรรมที่น่าสนใจ"
                    className={`w-full px-4 py-3 rounded-2xl border ${
                      errors.activityName ? "border-red-400 bg-red-50" : "border-black/10 bg-white"
                    } focus:outline-none focus:ring-2 focus:ring-[#E35205]/30 text-neutral-900`}
                  />
                  {errors.activityName && (
                    <p className="text-red-500 text-sm mt-1">{errors.activityName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">
                      หมวดหมู่ *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-2xl border ${
                        errors.category ? "border-red-400 bg-red-50" : "border-black/10 bg-white"
                      } focus:outline-none focus:ring-2 focus:ring-[#E35205]/30 text-neutral-900`}
                    >
                      <option value="">เลือกหมวดหมู่กิจกรรม</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">
                      สถานที่ *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="สถานที่จัดกิจกรรม"
                      className={`w-full px-4 py-3 rounded-2xl border ${
                        errors.location ? "border-red-400 bg-red-50" : "border-black/10 bg-white"
                      } focus:outline-none focus:ring-2 focus:ring-[#E35205]/30 text-neutral-900`}
                    />
                    {errors.location && (
                      <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    รูปภาพกิจกรรม
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#E35205]/30 text-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">
                      วันที่เริ่มต้น *
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#E35205]/30 text-neutral-900"
                    />
                    <TimePicker
                      onChange={(v) =>
                        handleInputChange({ target: { name: "startTime", value: v || "" } })
                      }
                      value={formData.startTime || ""}
                      disableClock
                      format="HH:mm"
                      clearIcon={null}
                      className="custom-timepicker w-full mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">
                      วันที่สิ้นสุด *
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#E35205]/30 text-neutral-900"
                    />
                    <TimePicker
                      onChange={(v) =>
                        handleInputChange({ target: { name: "endTime", value: v || "" } })
                      }
                      value={formData.endTime || ""}
                      disableClock
                      format="HH:mm"
                      clearIcon={null}
                      className="custom-timepicker w-full mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">
                      วันปิดรับสมัคร *
                    </label>
                    <input
                      type="date"
                      name="signUpDeadline"
                      value={formData.signUpDeadline}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#E35205]/30 text-neutral-900"
                    />
                    <TimePicker
                      onChange={(v) =>
                        handleInputChange({
                          target: { name: "signUpDeadlineTime", value: v || "" },
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

                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    รายละเอียดกิจกรรม *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={6}
                    placeholder="บรรยายรายละเอียดกิจกรรม วัตถุประสงค์ และข้อมูลสำคัญอื่น ๆ..."
                    className={`w-full px-4 py-3 rounded-2xl border ${
                      errors.description ? "border-red-400 bg-red-50" : "border-black/10 bg-white"
                    } focus:outline-none focus:ring-2 focus:ring-[#E35205]/30 text-neutral-900 resize-none`}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`btn-primary ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? "⏳ กำลังบันทึก..." : "🎉 บันทึกกิจกรรม"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isLoading}
                    className="px-6 py-3 rounded-2xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
                  >
                    🔄 ล้างข้อมูล
                  </button>
                </div>
              </form>
            </section>

            <aside className="card p-6 h-fit">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                📝 ข้อมูลที่กรอก (สรุป)
              </h3>
              <div className="space-y-3 text-sm text-neutral-800">
                <div><b>ชื่อกิจกรรม:</b> {formData.activityName || "-"}</div>
                <div><b>หมวดหมู่:</b> {formData.category || "-"}</div>
                <div><b>สถานที่:</b> {formData.location || "-"}</div>
                <div className="border-t border-black/5 pt-3">
                  <div><b>ปิดรับสมัคร:</b>{" "}
                    {formatDate(formData.signUpDeadline + "T" + formData.signUpDeadlineTime)}
                  </div>
                  <div><b>เริ่ม:</b>{" "}
                    {formatDate(formData.startDate + "T" + formData.startTime)}
                  </div>
                  <div><b>สิ้นสุด:</b>{" "}
                    {formatDate(formData.endDate + "T" + formData.endTime)}
                  </div>
                </div>
              </div>
              {activityImage && (
                <div className="mt-4 text-sm text-neutral-700">
                  <b>ไฟล์รูปภาพ:</b> {activityImage.name}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <StyleBlock />
    </MainLayout>
  );
}

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
      @keyframes bgShift {
        0%{ background-position: 0% 50% }
        50%{ background-position: 100% 50% }
        100%{ background-position: 0% 50% }
      }

      .card{
        border-radius: 24px;
        background: rgba(255,255,255,.94);
        border: 1px solid rgba(0,0,0,.05);
        backdrop-filter: blur(6px);
        box-shadow: 0 10px 28px rgba(0,0,0,.06);
      }

      .btn-primary{
        display:inline-flex; align-items:center; justify-content:center;
        padding:.875rem 1.25rem; border-radius:16px; color:#fff;
        background: linear-gradient(120deg,#FF944D,#E35205);
        box-shadow:0 10px 24px rgba(227,82,5,.28);
        transition:transform .15s ease, filter .2s ease, box-shadow .2s ease;
      }
      .btn-primary:hover{ filter:brightness(.98); box-shadow:0 14px 30px rgba(227,82,5,.38) }
      .btn-primary:active{ transform:scale(.98) }

      .custom-timepicker .react-time-picker__wrapper{
        border-radius: 14px;
        border: 1px solid rgba(0,0,0,.1);
        padding: .35rem .5rem;
        background: #fff;
      }
      .custom-timepicker .react-time-picker__inputGroup__input{
        color:#111827;
      }
    `}</style>
  );
}
