// app/groupChat/page.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { API_URL } from "@/lib/config";
import MainLayout from "../component/MainLayout.jsx";
import { Search, Send, Users } from "lucide-react";

export default function GroupChatPage() {
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [query, setQuery] = useState("");
  const scrollRef = useRef(null);

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
      } catch {
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
      } catch {}
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
      } catch {}
    };
    fetchMessages();
  }, [activeGroup]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredGroups = (Array.isArray(groups) ? groups : []).filter((g) =>
    g.name?.toLowerCase().includes(query.toLowerCase())
  );

  if (loadingAuth) {
    return <div className="p-6 text-neutral-700">กำลังตรวจสอบสถานะการล็อกอิน...</div>;
  }

  return (
    <MainLayout>
      <div className="page-bg min-h-[calc(100vh-80px)]">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <aside className="card overflow-hidden">
            <div className="p-4 border-b border-black/5 bg-gradient-to-r from-[#FFD0A6] via-[#FF944D] to-[#E35205] text-white">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-lg font-semibold">กลุ่มทั้งหมดที่เข้าร่วม</div>
              </div>
            </div>

            <div className="p-4 border-b border-black/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#E35205]/70" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหากลุ่ม…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-black/10 bg-white/95 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E35205]/30"
                />
              </div>
            </div>

            <ul className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {filteredGroups.length === 0 && (
                <li className="px-3 py-2 text-sm text-neutral-500">ไม่มีกลุ่มที่ตรงกับคำค้นหา</li>
              )}
              {filteredGroups.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setActiveGroup(g)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition ${
                      activeGroup?.id === g.id
                        ? "bg-[#FFF3EA] ring-1 ring-[#E35205]/30 text-neutral-900"
                        : "hover:bg-neutral-50 text-neutral-800"
                    }`}
                  >
                    <div className="font-semibold truncate">{g.name}</div>
                    {g.description && (
                      <div className="text-xs text-neutral-500 truncate">{g.description}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="card flex min-h-[70vh]">
            <div className="flex-1 flex flex-col">
              <div className="px-5 py-4 border-b border-black/5 bg-white/80 backdrop-blur sticky top-0 z-10 rounded-t-[24px]">
                <div className="text-lg font-semibold text-neutral-900">
                  {activeGroup ? activeGroup.name : "ยังไม่ได้เลือกกลุ่ม"}
                </div>
                {activeGroup?.description && (
                  <div className="text-xs text-neutral-500 mt-0.5">{activeGroup.description}</div>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 px-4 sm:px-6 py-5 overflow-y-auto space-y-3">
                {(Array.isArray(messages) ? messages : []).map((m) => {
                  const isMine = currentUser && m.user_id === currentUser.sub;
                  return (
                    <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-soft ${
                          isMine
                            ? "bg-[#E35205] text-white rounded-tr-sm"
                            : "bg-white text-neutral-900 border border-black/5 rounded-tl-sm"
                        }`}
                      >
                        <div className={`text-xs mb-1 ${isMine ? "text-white/80" : "text-neutral-500"}`}>
                          {isMine ? "ฉัน" : m.user_name || "ผู้ใช้"}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{m.message}</div>
                      </div>
                    </div>
                  );
                })}
                {(!messages || messages.length === 0) && (
                  <div className="text-center text-neutral-500 text-sm py-8">
                    ยังไม่มีข้อความ เริ่มการสนทนาได้เลย
                  </div>
                )}
              </div>

              {activeGroup && (
                <div className="p-3 sm:p-4 border-t border-black/5 bg-white/80 backdrop-blur rounded-b-[24px]">
                  <div className="flex items-end gap-2">
                    <textarea
                      className="flex-1 rounded-2xl border border-black/10 bg-white/95 text-neutral-900 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#E35205]/30"
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="พิมพ์ข้อความแล้วกด Enter เพื่อส่ง"
                    />
                    <button
                      onClick={handleSend}
                      className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white bg-[#E35205] hover:brightness-95 shadow-soft"
                    >
                      <Send className="w-4 h-4" />
                      ส่ง
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
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
      .shadow-soft{ box-shadow: 0 8px 22px rgba(0,0,0,.06); }
    `}</style>
  );
}
