import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("puzzle");
  const today = new Date().toISOString().slice(0, 10);
  const solvedAtIso = await store.get(`solved:${today}`);

  return Response.json({
    solvedToday: !!solvedAtIso,
    solvedAt: solvedAtIso ? solvedAtIso.slice(11, 16) + " UTC" : null,
  });
};
