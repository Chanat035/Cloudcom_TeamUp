export async function GET() {
  try {
    const response = await fetch("http://localhost:3100/api/eventSchedule", {
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
