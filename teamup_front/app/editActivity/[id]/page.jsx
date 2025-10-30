// editActivity/[id]/

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";
import MainLayout from "@/components/MainLayout";

export default function EditActivityPage() {
  const { id } = useParams();
  const router = useRouter();

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
  const [participants, setParticipants] = useState([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);

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

  // โหลดสถานะการล็อกอิน + activity data
  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (id && userInfo) {
      fetchActivityData(id);
    }
  }, [id, userInfo]);

  useEffect(() => {
    if (id) fetchParticipants(id);
  }, [id]);

  useEffect(() => {
    if (!isLoadingParticipants && userInfo) {
      const isOrganizer = participants.some(
        (p) => p.user_id === userInfo.sub && p.role === "organizer"
      );

      // ✅ block ถ้าไม่ใช่ organizer หรือ activity ไม่มี organizer
      if (!isOrganizer) {
        router.push(`/eventDetail/${id}`);
      }
    }
  }, [participants, isLoadingParticipants, userInfo, id, router]);

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

  const fetchActivityData = async (activityId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/eventDetail/${activityId}`
      );
      if (!res.ok) throw new Error("Failed to load activity data");
      const data = await res.json();

      setFormData({
        activityName: data.name,
        category: data.category,
        startDate: data.startdate ? data.startdate.split("T")[0] : "",
        startTime: data.startdate
          ? data.startdate.split("T")[1]?.slice(0, 5)
          : "",
        endDate: data.enddate ? data.enddate.split("T")[0] : "",
        endTime: data.enddate ? data.enddate.split("T")[1]?.slice(0, 5) : "",
        signUpDeadline: data.signupdeadline ? data.signupdeadline.split("T")[0] : "",
        signUpDeadlineTime: data.signupdeadline
          ? data.signupdeadline.split("T")[1]?.slice(0, 5)
          : "",
        description: data.description,
        location: data.location,
      });
    } catch (error) {
      console.error("Load activity failed:", error);
      alert("โหลดข้อมูลกิจกรรมล้มเหลว");
    }
  };

  const fetchParticipants = async (activityId) => {
    try {
      setIsLoadingParticipants(true);
      const res = await fetch(
        `${API_URL}/api/activity/${activityId}/participants`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load participants");
      const data = await res.json();
      setParticipants(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleParticipantChange = async (userId, field, value) => {
    try {
      const participant = participants.find((p) => p.user_id === userId);
      const updated = {
        status: field === "status" ? value : participant.status,
        role: field === "role" ? value : participant.role,
      };

      const res = await fetch(
        `${API_URL}/api/activity/${id}/participants/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Update failed");

      setParticipants((prev) =>
        prev.map((p) => (p.user_id === userId ? { ...p, ...updated } : p))
      );
    } catch (error) {
      console.error(error);
      alert("แก้ไขผู้เข้าร่วมล้มเหลว: " + error.message);
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
      // ✅ อัปเดตกิจกรรม
      const updatePayload = {
        name: formData.activityName,
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

      const updateResponse = await fetch(
        `${API_URL}/api/editActivity/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
          credentials: "include",
        }
      );

      if (!updateResponse.ok) {
        const err = await updateResponse.json();
        throw new Error(err.error || "Update failed");
      }

      // ✅ อัปโหลดรูปถ้ามีการเลือก
      if (activityImage) {
        const imageFormData = new FormData();
        imageFormData.append("activityImage", activityImage);

        await fetch(`${API_URL}/api/uploadActivityImage/${id}`, {
          method: "POST",
          body: imageFormData,
          credentials: "include",
        });
      }

      alert("อัปเดตกิจกรรมสำเร็จ 🎉");
      router.push(`/eventDetail/${id}`);
    } catch (error) {
      console.error("Update failed:", error);
      alert("แก้ไขกิจกรรมล้มเหลว: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            แก้ไขกิจกรรม
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            แก้ไขข้อมูลกิจกรรมของคุณเพื่ออัปเดตข้อมูลล่าสุด
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
                  placeholder="ใส่ชื่อกิจกรรม"
                />
                {errors.activityName && (
                  <p className="text-red-500 text-sm mt-2">
                    ⚠️ {errors.activityName}
                  </p>
                )}
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    หมวดหมู่ *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-6 py-4 rounded-2xl border-2 transition-all duration-300 text-black ${
                      errors.category
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 focus:border-purple-400 bg-white"
                    }`}
                  >
                    <option value="">เลือกหมวดหมู่</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-2">
                      ⚠️ {errors.category}
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
                    className={`w-full px-6 py-4 rounded-2xl border-2 transition-all duration-300 text-black ${
                      errors.location
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 focus:border-purple-400 bg-white"
                    }`}
                    placeholder="สถานที่จัดกิจกรรม"
                  />
                  {errors.location && (
                    <p className="text-red-500 text-sm mt-2">
                      ⚠️ {errors.location}
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
                  className={`w-full px-6 py-4 rounded-2xl border-2 resize-none text-black ${
                    errors.description
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 focus:border-purple-400 bg-white"
                  }`}
                  placeholder="บรรยายรายละเอียดกิจกรรม..."
                />
              </div>

              {/* Activity Image */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  รูปภาพกิจกรรม (อัปโหลดใหม่ถ้าต้องการเปลี่ยน)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white text-black"
                />
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
                  {isLoading ? "⏳ กำลังบันทึก..." : "💾 บันทึกการแก้ไข"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/eventDetail/${id}`)}
                  className="flex-none bg-gray-100 text-gray-700 px-8 py-4 rounded-2xl font-bold hover:bg-gray-200 hover:shadow-lg transition-all duration-300"
                >
                  🔙 ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Participants List */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            👥 ผู้เข้าร่วมกิจกรรม
          </h3>
          <button
            type="button"
            onClick={async () => {
              try {
                // loop participants ที่ pending แล้วอัปเดต
                for (const p of participants.filter(
                  (x) => x.status === "pending"
                )) {
                  await handleParticipantChange(p.user_id, "status", "joined");
                }
                alert("อัปเดตสถานะผู้เข้าร่วมจาก pending → joined สำเร็จ 🎉");
              } catch (err) {
                console.error(err);
                alert("เกิดข้อผิดพลาดในการอัปเดต");
              }
            }}
            className="mb-6 bg-green-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-600 transition"
          >
            ✅ เปลี่ยน Pending ทั้งหมดเป็น Joined
          </button>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-gray-700">
                  <th className="py-3 px-4">ชื่อผู้ใช้</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4">บทบาท</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.user_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-black">{p.name}</td>
                    <td className="py-3 px-4">
                      <select
                        value={p.status}
                        onChange={(e) =>
                          handleParticipantChange(
                            p.user_id,
                            "status",
                            e.target.value
                          )
                        }
                        className="border rounded px-2 py-1 text-black"
                      >
                        <option value="joined">joined</option>
                        <option value="pending">pending</option>
                        <option value="canceled">canceled</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={p.role}
                        onChange={(e) =>
                          handleParticipantChange(
                            p.user_id,
                            "role",
                            e.target.value
                          )
                        }
                        className="border rounded px-2 py-1 text-black"
                      >
                        <option value="organizer">organizer</option>
                        <option value="participant">participant</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
  );
}
