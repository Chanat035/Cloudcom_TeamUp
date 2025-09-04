export async function GET(request) {
  try {
    // เรียก API จาก backend เพื่อตรวจสอบสถานะ authentication
    const response = await fetch("http://localhost:3100/api/auth/status", {
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
