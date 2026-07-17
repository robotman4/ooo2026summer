export default async () => {
  const flag = process.env.PUZZLE_FLAG;
  const key = "n3tl1fy"; // must match X-Puzzle-Key in netlify.toml

  if (!flag) {
    return Response.json({ error: "server not configured" }, { status: 500 });
  }

  const flagBytes = Buffer.from(flag, "utf8");
  const keyBytes = Buffer.from(key, "utf8");
  const xored = Buffer.from(
    flagBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length])
  );

  return Response.json({ cipher: xored.toString("base64") });
};
