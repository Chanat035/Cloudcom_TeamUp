"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";

import AdventureButton from "./component/AdventureButton";

export default function Page() {
  const options = ["Hackathon", "Sports", "Workshop", "Volunteer", "Game Jam"];

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const router = useRouter();

  const responseType = "code";
  const scope = "profile openid email";

  const loginUrl = `${COGNITO_DOMAIN}/login?client_id=${COGNITO_CLIENT_ID}&response_type=${responseType}&scope=${scope}&redirect_uri=${OAUTH_REDIRECT_URI}`;

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/status`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.isAuthenticated);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      router.push("/home");
    } else {
      window.location.href = loginUrl;
    }
  };

  return (
    <main className="min-h-screen w-full grid place-items-center">
      <section className="bg-card bg-white px-10 py-10 shadow-soft w-[820px] max-w-[92vw]">
        <h1 className="text-center text-2xl sm:text-3xl tracking-wide text-neutral-900">
          What’s your next adventure?
        </h1>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {options.map((label) => (
            <button
              type="button"
              key={label}
              aria-disabled="true"
              onClick={handleLogin}
              className="rounded-full border-2 border-neutral-400/80 px-5 py-2.5 text-base text-neutral-900
                        hover:border-neutral-700 hover:shadow
                        focus:outline-none focus:ring-4 focus:ring-neutral-300 active:scale-[0.99]
                        transition"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
