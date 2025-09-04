export async function POST(request) {
  try {
    // เรียก API จาก backend เพื่อ logout
    const response = await fetch("http://localhost:3100/api/auth/logout", {
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
