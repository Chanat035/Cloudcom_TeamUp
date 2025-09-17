"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

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

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    const checkAuthAndFetchEvents = async () => {
      try {
        const authRes = await fetch("http://localhost:3100/api/auth/status", {
          credentials: "include",
        });
        const authData = await authRes.json();

        if (!authData.isAuthenticated) {
          window.location.href = "http://localhost:3100/login";
          return;
        }

        setAuthChecked(true);

        // Fetch events
        const res = await fetch("http://localhost:3100/api/eventSchedule", {
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
          });
        });

        setEventsDatabase(grouped);
      } catch (err) {
        console.error("Auth check or fetch failed:", err);
        window.location.href = "http://localhost:3100/login";
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
    if (events) {
      setSelectedDate(date);
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  const getDaysInMonth = (month, year) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

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

  const navigatePickerMonth = (direction) => {
    if (direction === "prev") {
      if (pickerMonth === 0) {
        setPickerMonth(11);
        setPickerYear(pickerYear - 1);
      } else {
        setPickerMonth(pickerMonth - 1);
      }
    } else {
      if (pickerMonth === 11) {
        setPickerMonth(0);
        setPickerYear(pickerYear + 1);
      } else {
        setPickerMonth(pickerMonth + 1);
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
    if (events) {
      setShowModal(true);
    }
  };

  const renderCalendarGrid = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvents = getEventsForDate(currentYear, currentMonth, day);
      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-800 p-1 cursor-pointer transition-colors ${
            hasEvents
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "hover:bg-gray-700 text-white"
          }`}
          onClick={() => handleDateClick(day)}
        >
          <div className="font-bold text-sm mb-1">{day}</div>
          {hasEvents && (
            <div className="text-xs text-yellow-400 font-medium truncate">
              {hasEvents[0].title}
              {hasEvents.length > 1 && (
                <div className="text-xs text-gray-400">
                  +{hasEvents.length - 1} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
  if (!searchQuery.trim()) return;

  let found = null;

  for (const year in eventsDatabase) {
    for (const month in eventsDatabase[year]) {
      for (const day in eventsDatabase[year][month]) {
        const events = eventsDatabase[year][month][day];
        for (const event of events) {
          if (event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            found = { year: parseInt(year), month: parseInt(month), day: parseInt(day) };
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


  const renderDatePickerGrid = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(pickerMonth, pickerYear);
    const firstDay = getFirstDayOfMonth(pickerMonth, pickerYear);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvents = getEventsForDate(pickerYear, pickerMonth, day);
      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === pickerMonth &&
        new Date().getFullYear() === pickerYear;

      days.push(
        <div
          key={day}
          className={`h-8 flex items-center justify-center cursor-pointer transition-colors text-sm ${
            isToday
              ? "bg-yellow-500 text-black rounded-full"
              : hasEvents
              ? "bg-gray-800 text-yellow-400 hover:bg-gray-700 rounded"
              : "hover:bg-gray-700 rounded text-white"
          }`}
          onClick={() => handlePickerDateClick(day)}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  if (!authChecked)
    return <div className="text-white">Checking authentication...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-black text-white">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center mb-4">
          <Calendar className="w-12 h-12 text-white mr-4" />
          <h1 className="text-4xl font-bold">Events</h1>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <ChevronLeft />
          </button>
          <h2 className="text-2xl font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Date Picker Button */}
        <button
          onClick={openDatePicker}
          className="mb-4 bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 transition-colors flex items-center gap-2 mx-auto"
        >
          <CalendarDays className="w-4 h-4" />
          Select Date
        </button>
      </div>
      {/* Search Bar */}
      <div className="mb-4 flex justify-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search activity..."
          className="px-4 py-2 rounded-lg text-white w-80"
        />
        <button
          onClick={handleSearch}
          className="ml-2 bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400"
        >
          Search
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-0 mb-4">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <div
            key={day}
            className="h-10 flex items-center justify-center bg-gray-900 font-semibold border border-gray-800 text-white"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0 border border-gray-800">
        {renderCalendarGrid()}
      </div>

      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-sm w-full p-4 text-white">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">
                {monthNames[pickerMonth]} {pickerYear}
              </h3>
            </div>
            <div className="flex justify-between items-center mt-2">
              <button
                onClick={() => setPickerYear(pickerYear - 1)}
                className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
              >
                Prev Year
              </button>
              <span>{pickerYear}</span>
              <button
                onClick={() => setPickerYear(pickerYear + 1)}
                className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
              >
                Next Year
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {monthNames.map((month, index) => (
                <button
                  key={month}
                  className={`px-3 py-2 rounded ${
                    index === pickerMonth
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-800 text-white hover:bg-gray-700"
                  }`}
                  onClick={() => {
                    setCurrentMonth(index);
                    setCurrentYear(pickerYear);
                    setShowDatePicker(false);
                  }}
                >
                  {month.substring(0, 3)}
                </button>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowDatePicker(false)}
                className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showModal &&
        selectedDate &&
        getEventsForDate(currentYear, currentMonth, selectedDate) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 text-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">
                  {monthNames[currentMonth]} {selectedDate}, {currentYear}
                </h3>
                <button onClick={closeModal}>
                  <X />
                </button>
              </div>
              <div className="space-y-4">
                {getEventsForDate(currentYear, currentMonth, selectedDate).map(
                  (event, index) => (
                    <div
                      key={index}
                      onClick={() =>
                        (window.location.href = `/eventDetail/${event.id}`)
                      }
                      className="border border-gray-800 rounded-lg p-4 bg-gray-800 cursor-pointer hover:bg-gray-700 transition"
                    >
                      <h4 className="text-xl font-semibold text-yellow-400">
                        {event.title}
                      </h4>
                      <div className="flex items-center text-yellow-200">
                        <MapPin className="w-4 h-4 mr-2" /> {event.venue}
                      </div>
                      <p className="text-gray-300">{event.description}</p>
                    </div>
                  )
                )}
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={closeModal}
                  className="bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default EventsCalendar;
