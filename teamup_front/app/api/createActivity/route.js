import { API_URL, FRONTEND_URL, COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } from "@/lib/config";

export async function POST(request) {
  try {
    const data = await request.json();

    const response = await fetch(`${API_URL}/api/createActivity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create activity");
    }

    const result = await response.json();
    return Response.json(result);
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
