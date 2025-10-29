import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";

export async function GET(request) {
  try {
    // เรียก API จาก backend เพื่อตรวจสอบสถานะ authentication
    const response = await fetch(`${API_URL}/api/auth/status`, {
      credentials: "include",
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data);
    } else {
      return Response.json({
        isAuthenticated: false,
        userInfo: null,
      });
    }
  } catch (error) {
    console.error("Error checking auth status:", error);
    return Response.json({
      isAuthenticated: false,
      userInfo: null,
    });
  }
}
