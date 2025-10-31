"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Search,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import MainLayout from "../component/MainLayout.jsx";

const ORANGE = "#E35205";

const EventsCalendar = () => {
  const [eventsDatabase, setEventsDatabase] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [authChecked, setAuthChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const monthNames = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  const dow = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  useEffect(() => {
    const checkAuthAndFetchEvents = async () => {
      try {
        const authRes = await fetch(`${API_URL}/api/auth/status`, {
          credentials: "include",
        });
        const authData = await authRes.json();

        if (!authData.isAuthenticated) {
          window.location.href = `${API_URL}/login`;
          return;
        }

        setAuthChecked(true);

        const res = await fetch(`${API_URL}/api/eventSchedule`, {
          credentials: "include",
        });
        const data = await res.json();

        const grouped = {};
        data.forEach((event) => {
          const start = new Date(event.startdate);
          const end = new Date(event.enddate);
          const y = start.getFullYear();
          const m = start.getMonth();
          const d = start.getDate();

          if (!grouped[y]) grouped[y] = {};
          if (!grouped[y][m]) grouped[y][m] = {};
          if (!grouped[y][m][d]) grouped[y][m][d] = [];

          grouped[y][m][d].push({
            id: event.id,
            title: event.name,
            time: `${start.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })} - ${end.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
            venue: event.location,
            description: event.description,
            signupdeadline: event.signupdeadline,
          });
        });

        setEventsDatabase(grouped);
      } catch (err) {
        console.error("Auth check or fetch failed:", err);
        window.location.href = `${API_URL}/login`;
      }
    };

    checkAuthAndFetchEvents();
  }, []);

  const getEventsForDate = (year, month, day) =>
    (eventsDatabase[year] &&
      eventsDatabase[year][month] &&
      eventsDatabase[year][month][day]) ||
    null;

  const handleDateClick = (date) => {
    const events = getEventsForDate(currentYear, currentMonth, date);
    setSelectedDate(date);
    if (events) setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  const getDaysInMonth = (month, year) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) =>
    new Date(year, month, 1).getDay();

  const navigateMonth = (direction) => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const openDatePicker = () => {
    setPickerMonth(currentMonth);
    setPickerYear(currentYear);
    setShowDatePicker(true);
  };

  const handlePickerDateClick = (date) => {
    setCurrentMonth(pickerMonth);
    setCurrentYear(pickerYear);
    setSelectedDate(date);
    setShowDatePicker(false);

    const events = getEventsForDate(pickerYear, pickerMonth, date);
    if (events) setShowModal(true);
  };

  const renderCalendarGrid = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvents = getEventsForDate(currentYear, currentMonth, day);
      const isToday =
        day === new Date().getDate() &&
        currentMonth === new Date().getMonth() &&
        currentYear === new Date().getFullYear();

      days.push(
        <button
          key={day}
          className={`h-24 border p-2 rounded-xl flex flex-col justify-between text-left transition-all
            ${
              hasEvents
                ? "bg-orange-50/70 border-orange-200 hover:bg-orange-100/60"
                : "hover:bg-orange-50/40 border-neutral-200"
            } ${isToday ? "ring-2 ring-orange-400" : ""}`}
          onClick={() => handleDateClick(day)}
        >
          <div
            className={`font-semibold text-sm ${
              isToday ? "text-orange-700" : "text-neutral-800"
            }`}
          >
            {day}
          </div>

          {hasEvents ? (
            <div className="text-xs truncate">
              <div className="font-medium text-orange-700/95">
                {hasEvents[0].title}
              </div>
              {hasEvents.length > 1 && (
                <div className="text-[11px] text-neutral-500">
                  +{hasEvents.length - 1} รายการ
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-neutral-400" />
          )}
        </button>
      );
    }

    return days;
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    let found = null;

    for (const year in eventsDatabase) {
      for (const month in eventsDatabase[year]) {
        for (const day in eventsDatabase[year][month]) {
          const events = eventsDatabase[year][month][day];
          for (const event of events) {
            if (
              event.title.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
              found = {
                year: parseInt(year),
                month: parseInt(month),
                day: parseInt(day),
              };
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (found) break;
    }

    if (found) {
      setCurrentYear(found.year);
      setCurrentMonth(found.month);
      setSelectedDate(found.day);
      setShowModal(true);
    } else {
      alert("ไม่พบกิจกรรมที่ค้นหา");
    }
  };

  function parseBangkok(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return new Date(d.getTime() - 7 * 60 * 60 * 1000);
  }

  if (!authChecked)
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-neutral-600">
        Checking authentication...
      </div>
    );

  return (
    <MainLayout>
      <div className="min-h-screen page-bg">
        <main className="max-w-6xl mx-auto p-6">
          {/* Hero / Header */}
          <section className="rounded-3xl p-6 md:p-7 hero shadow-[0_18px_50px_rgba(227,82,5,.18)]">
            <div className="hero-overlay" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E35205] to-[#FF944D] flex items-center justify-center shadow-md">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900">
                  ปฏิทินกิจกรรม
                </h1>
              </div>

              <div className="flex items-center justify-center gap-2 md:gap-4">
                <button
                  onClick={() => navigateMonth("prev")}
                  className="icon-btn"
                  aria-label="Prev"
                >
                  <ChevronLeft />
                </button>
                <h2 className="text-xl md:text-2xl font-semibold text-neutral-900">
                  {monthNames[currentMonth]} {currentYear + 543}
                </h2>
                <button
                  onClick={() => navigateMonth("next")}
                  className="icon-btn"
                  aria-label="Next"
                >
                  <ChevronRight />
                </button>

                <button onClick={openDatePicker} className="btn-primary ml-2">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  เลือกวันที่
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mt-4 flex justify-center">
              <div className="relative w-full max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหากิจกรรม..."
                  className="w-full pl-10 pr-24 py-3 rounded-2xl border border-white/60 bg-white/95 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-300 shadow-[0_8px_22px_rgba(0,0,0,.06)]"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-[#E35205] to-[#FF944D] shadow hover:shadow-lg transition"
                >
                  ค้นหา
                </button>
              </div>
            </div>
          </section>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mt-6">
            {dow.map((d) => (
              <div
                key={d}
                className="h-10 flex items-center justify-center font-semibold text-neutral-800 bg-white/80 rounded-xl border border-neutral-200"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mt-1">{renderCalendarGrid()}</div>

          {/* Date Picker */}
          {showDatePicker && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 rounded-2xl max-w-sm w-full p-5 text-neutral-900 shadow-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">
                    {monthNames[pickerMonth]} {pickerYear + 543}
                  </h3>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <button
                    onClick={() => setPickerYear(pickerYear - 1)}
                    className="subtle-btn"
                  >
                    ปีก่อน
                  </button>
                  <span className="font-medium">{pickerYear + 543}</span>
                  <button
                    onClick={() => setPickerYear(pickerYear + 1)}
                    className="subtle-btn"
                  >
                    ปีหน้า
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {monthNames.map((month, index) => (
                    <button
                      key={month}
                      className={`px-3 py-2 rounded-xl border ${
                        index === pickerMonth
                          ? "text-white bg-gradient-to-r from-[#E35205] to-[#FF944D] border-transparent"
                          : "bg-white/80 text-neutral-900 hover:bg-neutral-100 border-neutral-200"
                      }`}
                      onClick={() => {
                        setCurrentMonth(index);
                        setCurrentYear(pickerYear);
                        setShowDatePicker(false);
                      }}
                    >
                      {month}
                    </button>
                  ))}
                </div>

                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="btn-primary"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Event Details Modal */}
          {showModal &&
            selectedDate &&
            getEventsForDate(currentYear, currentMonth, selectedDate) && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                <div className="bg-white/95 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 text-neutral-900 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold">
                      {selectedDate} {monthNames[currentMonth]}{" "}
                      {currentYear + 543}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {getEventsForDate(
                      currentYear,
                      currentMonth,
                      selectedDate
                    ).map((event, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          (window.location.href = `/eventDetail/${event.id}`)
                        }
                        className="w-full text-left border rounded-xl p-4 bg-white/90 hover:bg-white transition shadow-sm"
                      >
                        <h4 className="text-lg font-semibold text-orange-600">
                          {event.title}
                        </h4>
                        <div className="mt-1 text-orange-600 flex items-center">
                          <MapPin className="w-4 h-4 mr-2" /> {event.venue}
                        </div>
                        <p className="text-neutral-700 mt-1">
                          {event.description}
                        </p>
                        {event.signupdeadline && (
                          <div className="flex items-center text-orange-600 mt-2">
                            <Clock className="w-4 h-4 mr-2" />
                            ลงสมัครได้ถึง :{" "}
                            {parseBangkok(
                              event.signupdeadline
                            )?.toLocaleString("th-TH", {
                              dateStyle: "long",
                              timeStyle: "short",
                            })}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <button onClick={closeModal} className="btn-primary">
                      ปิด
                    </button>
                  </div>
                </div>
              </div>
            )}
        </main>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&display=swap");
        html,
        body {
          font-family: "IBM Plex Sans Thai Looped", system-ui, -apple-system,
            "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Thai",
            sans-serif;
        }
        .page-bg {
          --c1: #fff3e9;
          --c2: #fffdf9;
          --c3: #ffe7d6;
          background: radial-gradient(
            1200px 600px at 15% -10%,
            var(--c3) 0,
            var(--c2) 45%,
            var(--c1) 70%
          );
          background-size: 160% 160%;
          animation: bgShift 24s ease-in-out infinite;
        }
        @keyframes bgShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(120deg, #ffd0a6, #ff944d, #e35205);
          background-size: 220% 220%;
          animation: heroFlow 12s ease-in-out infinite,
            floatSoft 8s ease-in-out infinite;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            600px 220px at 65% 55%,
            rgba(255, 255, 255, 0.5),
            transparent 60%
          );
          mix-blend-mode: screen;
          filter: blur(2px);
          animation: glowShift 10s ease-in-out infinite;
        }
        @keyframes heroFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes glowShift {
          0%,
          100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(-10px) translateY(6px);
          }
        }
        @keyframes floatSoft {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.6rem 1rem;
          border-radius: 0.9rem;
          color: #fff;
          background: linear-gradient(90deg, #e35205, #ff944d);
          box-shadow: 0 10px 22px rgba(227, 82, 5, 0.35);
          transition: transform 0.15s ease, filter 0.2s ease,
            box-shadow 0.2s ease;
        }
        .btn-primary:hover {
          filter: brightness(0.98);
          box-shadow: 0 14px 28px rgba(227, 82, 5, 0.45);
        }
        .icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.06);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
          color: #444;
          transition: transform 0.15s ease, background 0.2s ease;
        }
        .icon-btn:hover {
          transform: translateY(-1px);
          background: #fff;
        }
        .subtle-btn {
          padding: 0.35rem 0.6rem;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.04);
          transition: background 0.2s ease;
        }
        .subtle-btn:hover {
          background: rgba(0, 0, 0, 0.07);
        }
      `}</style>
    </MainLayout>
  );
};

export default EventsCalendar;
