"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_URL,
  COGNITO_DOMAIN,
  COGNITO_CLIENT_ID,
  OAUTH_REDIRECT_URI,
} from "@/lib/config";

export default function Page() {
  const options = ["Hackathon", "Sports", "Workshop", "Volunteer", "Game Jam"];

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const responseType = "code";
  const scope = "profile openid email";
  const loginUrl = `${COGNITO_DOMAIN}/login?client_id=${COGNITO_CLIENT_ID}&response_type=${responseType}&scope=${scope}&redirect_uri=${OAUTH_REDIRECT_URI}`;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/status`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(Boolean(data.isAuthenticated));
        }
      } catch (e) {
        console.error("auth status error", e);
      }
    })();
  }, []);

  const handleLogin = () => {
    if (isAuthenticated) router.push("/home");
    else window.location.href = loginUrl;
  };

  return (
    <main className="min-h-screen w-full grid place-items-center landing-bg px-6">
      <section className="welcome-card">
        <div className="hero-head">
          <div className="logo-dot">TU</div>
          <h1 className="title">ยินดีต้อนรับสู่ TeamUp 💫</h1>
          <p className="tagline">
            ค้นหาและเข้าร่วมกิจกรรมสุดมันในแคมปัส—เริ่มด้วยสไตล์ที่ใช่ของคุณ
          </p>
        </div>

        <div className="chips">
          {options.map((label, i) => (
            <button
              key={label}
              onClick={handleLogin}
              className="chip"
              style={{ animationDelay: `${i * 90}ms` }}
              aria-label={`เลือก ${label}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button onClick={handleLogin} className="cta">
          เริ่มใช้งาน
        </button>
      </section>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&display=swap');
        html, body {
          font-family: 'IBM Plex Sans Thai Looped', system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
        }

        .landing-bg {
          position: relative;
          overflow: hidden;
          --c1:#FFF3E9; --c2:#FFFDF9; --c3:#FFE7D6;
          background:
            radial-gradient(900px 420px at 15% 0%, var(--c3) 0, var(--c2) 55%, var(--c1) 80%),
            radial-gradient(700px 380px at 85% 100%, #ffe1cf, transparent 60%);
          background-size: 160% 160%;
          animation: bgShift 24s ease-in-out infinite;
        }

        .landing-bg::before {
          content: "";
          position: absolute;
          inset: -20px;
          background: url("https://www.kmitl.ac.th/sites/default/files/2021-08/_MG_5_11.jpg")
                      center / cover no-repeat;
          filter: blur(14px) saturate(110%);
          transform: scale(1.06);
          opacity: 0.38;
          z-index: -1;
          pointer-events: none;
        }

        @keyframes bgShift {
          0% { background-position: 0% 50%, 100% 50%; }
          50% { background-position: 100% 50%, 0% 50%; }
          100% { background-position: 0% 50%, 100% 50%; }
        }

        .welcome-card {
          width: 900px;
          max-width: 96vw;
          border-radius: 28px;
          background: linear-gradient(120deg, #FFD0A6, #FF944D, #E35205);
          background-size: 220% 220%;
          animation: heroFlow 12s ease-in-out infinite, floatSoft 8s ease-in-out infinite;
          box-shadow: 0 20px 60px rgba(227,82,5,.18), 0 2px 0 rgba(0,0,0,.02) inset;
          padding: 34px 28px 28px;
          position: relative;
          overflow: hidden;
        }

        @keyframes heroFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floatSoft {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .hero-head {
          position: relative;
          z-index: 1;
          text-align: center;
          color: #1f2937;
        }
        .logo-dot {
          width: 58px; height: 58px;
          margin: 0 auto 8px;
          border-radius: 16px;
          display: grid; place-items: center;
          font-weight: 800; letter-spacing: .5px;
          color: white;
          background: linear-gradient(135deg, #ff9b57, #e35205);
          box-shadow: 0 10px 24px rgba(227,82,5,.35);
        }
        .title {
          font-size: clamp(24px, 2.4vw, 34px);
          font-weight: 800;
          color: #111827;
        }
        .tagline {
          margin-top: 6px;
          color: #1f2937;
          opacity: .92;
        }

        .chips {
          margin: 22px auto 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }
        .chip {
          --o:#E35205;
          padding: 10px 18px;
          border-radius: 9999px;
          border: 2px solid rgba(17,24,39,.14);
          background: rgba(255,255,255,.94);
          color: #111827;
          font-weight: 600;
          letter-spacing: .2px;
          box-shadow: 0 8px 22px rgba(0,0,0,.06);
          transition: transform .18s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease;
          animation: fadeUp .6s both;
        }
        .chip:hover {
          transform: translateY(-2px);
          border-color: var(--o);
          background: #fff7f2;
          box-shadow: 0 12px 28px rgba(227,82,5,.22);
        }
        .chip:active { transform: scale(.98); }

        .cta {
          display: block;
          width: max-content;
          margin: 12px auto 0;
          padding: 11px 22px;
          border-radius: 9999px;
          color: white;
          font-weight: 700;
          background: #E35205;
          box-shadow: 0 12px 30px rgba(227,82,5,.38);
          transition: filter .18s ease, transform .12s ease, box-shadow .18s ease;
          animation: pulseSoft 2.8s ease-in-out infinite;
        }
        .cta:hover {
          filter: brightness(.98);
          box-shadow: 0 16px 38px rgba(227,82,5,.45);
        }
        .cta:active { transform: scale(.98); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseSoft {
          0%,100% { box-shadow: 0 12px 30px rgba(227,82,5,.38); }
          50% { box-shadow: 0 16px 42px rgba(227,82,5,.48); }
        }
      `}</style>
    </main>
  );
}
