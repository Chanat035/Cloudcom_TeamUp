export async function POST(request) {
  try {
    const data = await request.json();

    const response = await fetch("http://localhost:3100/api/createActivity", {
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
