"use client";

import React, { useEffect, useRef, useState } from "react";
import MainLayout from "../component/MainLayout.jsx";
import { API_URL } from "@/lib/config";
import { Send, User } from "lucide-react";

export default function GroupChatPage({ currentUserId = null }) {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchGroupsAndMessages = async () => {
      try {
        setLoading(true);
        const gRes = await fetch(`${API_URL}/api/groups`, { credentials: "include" });
        const gData = await gRes.json();
        setGroups(gData || []);

        const first = (gData && gData[0]) || null;
        setActiveGroup(first);

        if (first) {
          const mRes = await fetch(`${API_URL}/api/groups/${first.id}/messages`, { credentials: "include" });
          const mData = await mRes.json();
          setMessages(mData || []);
        }
      } catch (err) {
        console.error("fetch groups/messages error", err);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    };

    fetchGroupsAndMessages();

    // (Optional) poll for new messages every 8s — adjust or remove as needed
    const interval = setInterval(async () => {
      if (!activeGroup) return;
      try {
        const mRes = await fetch(`${API_URL}/api/groups/${activeGroup.id}/messages`, { credentials: "include" });
        const mData = await mRes.json();
        setMessages(mData || []);
        scrollToBottom();
      } catch (err) {
        // ignore polling errors
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [activeGroup?.id]);

  useEffect(() => scrollToBottom(), [messages]);

  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {}
  };

  const handleGroupClick = async (g) => {
    setActiveGroup(g);
    setMessages([]);
    try {
      const mRes = await fetch(`${API_URL}/api/groups/${g.id}/messages`, { credentials: "include" });
      const mData = await mRes.json();
      setMessages(mData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !activeGroup) return;
    try {
      const payload = { message: content };
      const res = await fetch(`${API_URL}/api/groups/${activeGroup.id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("send_failed");
      // optimistic update: append message locally (assumes backend will fill id/time)
      const newMsg = {
        id: `local-${Date.now()}`,
        user_id: currentUserId,
        user_name: "ฉัน",
        message: content,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((m) => [...m, newMsg]);
      setText("");
      scrollToBottom();
    } catch (err) {
      console.error(err);
      alert("ส่งข้อความไม่สำเร็จ");
    }
  };

  if (loading)
    return (
      <MainLayout>
        <div className="p-6 text-gray-700">กำลังโหลดแชท...</div>
      </MainLayout>
    );

  return (
    <MainLayout>
      <div className="flex h-screen">
        <aside className="w-72 border-r bg-white/60 p-4">
          <h3 className="font-semibold mb-3 text-gray-900">กลุ่มแชท</h3>
          <ul className="space-y-2">
            {groups.length === 0 && <li className="text-gray-500">ยังไม่มีการตั้งค่ากลุ่ม</li>}
            {groups.map((g) => (
              <li
                key={g.id}
                onClick={() => handleGroupClick(g)}
                className={`p-2 rounded cursor-pointer ${activeGroup?.id === g.id ? "bg-pink-100/90 border border-pink-200 text-pink-700 font-semibold" : "hover:bg-white/50 text-gray-900"}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-700">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{g.name}</div>
                    <div className="text-xs text-gray-500">{g.lastMessagePreview || ""}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="p-4 border-b bg-white/60">
            <div className="text-lg font-semibold text-gray-900">{activeGroup?.name || "เลือกกลุ่ม"}</div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
            {messages.length === 0 && <div className="text-center text-gray-500 mt-8">ยังไม่มีข้อความ</div>}

            {messages.map((m) => {
              const isMine = m.user_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${isMine ? "bg-pink-100 border border-pink-200 text-pink-800" : "bg-white/80 border border-gray-100 text-gray-900"}`}>
                    <div className="text-xs font-semibold mb-1">{isMine ? "ฉัน" : m.user_name}</div>
                    <div className="text-sm whitespace-pre-line">{m.message}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{m.time}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-3 bg-white/60 flex items-center gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
              rows={1}
              className="flex-1 rounded px-3 py-2 resize-none bg-white/50 text-gray-900"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button onClick={handleSend} className="ml-2 px-4 py-2 rounded bg-pink-600 text-white flex items-center gap-2 hover:bg-pink-700">
              <Send className="w-4 h-4" /> ส่ง
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
