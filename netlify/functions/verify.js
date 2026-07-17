import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ correct: false }, { status: 400 });
  }

  const submitted = (body.answer || "").trim();
  const solver = (body.solver || "").trim().slice(0, 60) || "anonymous";
  const expected = process.env.PUZZLE_FLAG; // set in Netlify env vars

  if (!expected) {
    return Response.json({ error: "server not configured" }, { status: 500 });
  }

  const correct = submitted === expected;
  if (!correct) {
    return Response.json({ correct: false });
  }

  const store = getStore("puzzle");
  const today = new Date().toISOString().slice(0, 10);
  const key = `solved:${today}`;

  const existing = await store.get(key);
  if (existing) {
    return Response.json({ correct: true, alreadySolvedToday: true });
  }

  const solvedAtIso = new Date().toISOString();
  await store.set(key, solvedAtIso);

  const ntfyTopic = process.env.NTFY_TOPIC;
  if (ntfyTopic) {
    try {
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: "POST",
        headers: {
          Title: "OOO puzzle solved",
          Priority: "default",
          Tags: "tada",
        },
        body: `Solved by ${solver} at ${solvedAtIso} UTC`,
      });
    } catch {
      // don't fail the request if the notification fails
    }
  }

  return Response.json({ correct: true, alreadySolvedToday: false });
};
