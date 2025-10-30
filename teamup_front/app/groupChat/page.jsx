// app/groupChat/page.jsx
"use client";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/config";
import MainLayout from "@/components/MainLayout";

export default function GroupChatPage() {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, { credentials: "include" });
        const data = await res.json();
        if (!data?.isAuthenticated) {
          window.location.href = `${API_URL}/login`;
          return;
        }
        setCurrentUser(data.userInfo || null);
      } catch (err) {
        console.error("Auth check failed:", err);
        window.location.href = `${API_URL}/login`;
      } finally {
        setLoadingAuth(false);
      }
    };
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${API_URL}/api/myGroups/chat`, { credentials: "include" });
        const data = await res.json();
        if (Array.isArray(data)) {
          setGroups(data);
          if (data.length > 0) setActiveGroup(data[0]);
        }
      } catch (err) {
        console.error("Failed to load groups:", err);
      }
    };
    fetchGroups();
  }, [currentUser]);

  useEffect(() => {
    if (!activeGroup) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/activity/${activeGroup.id}/messages`, { credentials: "include" });
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };
    fetchMessages();
  }, [activeGroup]);

  const handleSend = async () => {
    if (!input.trim() || !activeGroup) return;
    try {
      await fetch(`${API_URL}/api/activity/${activeGroup.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: input }),
      });
      setInput("");
      const res = await fetch(`${API_URL}/api/activity/${activeGroup.id}/messages`, { credentials: "include" });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Send message failed:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loadingAuth) {
    return <div className="p-6">กำลังตรวจสอบสถานะการล็อกอิน...</div>;
  }

  return (
    <MainLayout>
    <div className="flex h-screen border">
      <div className="w-1/4 border-r p-2">
        <h2 className="font-bold mb-2">กลุ่มทั้งหมดที่เข้าร่วม</h2>
        <ul>
          {(Array.isArray(groups) ? groups : []).map((g) => (
            <li key={g.id} onClick={() => setActiveGroup(g)} className={`p-2 cursor-pointer rounded ${activeGroup?.id === g.id ? "bg-blue-100 text-black font-semibold" : ""}`}>
              {g.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="border-b p-3 font-bold text-lg">{activeGroup ? activeGroup.name : "ยังไม่ได้เลือกกลุ่ม"}</div>

        <div className="flex-1 p-3 overflow-y-auto">
          {(Array.isArray(messages) ? messages : []).map((m) => {
            const isMine = currentUser && m.user_id === currentUser.sub;
            return (
              <div key={m.id} className={`mb-2 flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs px-3 py-2 rounded-lg ${isMine ? "bg-blue-500 text-white text-right" : "bg-gray-200 text-black text-left"}`}>
                  <div className="text-sm font-semibold mb-1">{isMine ? "ฉัน" : m.user_name}</div>
                  <div>{m.message}</div>
                </div>
              </div>
            );
          })}
        </div>

        {activeGroup && (
          <div className="border-t p-3 flex">
            <textarea className="flex-1 border rounded px-2 py-1 resize-none" rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="พิมพ์แล้วกด Enter เพื่อส่ง" />
            <button onClick={handleSend} className="ml-2 px-4 py-1 bg-blue-500 text-white rounded">ส่ง</button>
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
}
