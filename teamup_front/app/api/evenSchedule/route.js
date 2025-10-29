import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/eventSchedule`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch activities");
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return Response.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
