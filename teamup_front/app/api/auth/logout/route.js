import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";

export async function POST(request) {
  try {
    // เรียก API จาก backend เพื่อ logout
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    });

    if (response.ok) {
      return Response.json({ success: true });
    } else {
      return Response.json({ success: false }, { status: 400 });
    }
  } catch (error) {
    console.error("Error logging out:", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
