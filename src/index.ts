import { Hono } from "hono/tiny";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { getConnInfo } from "hono/cloudflare-workers";

type Bindings = {
  ORIGINS: string[];
  EMOJIS: string[];
  SLUGS: (string | [string, string[]])[];
  DB: D1Database;
};

async function hashed(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hased = String.fromCharCode(...new Uint8Array(buf.slice(0, 16)));
  return btoa(hased).replace(/=+$/, "");
}

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", secureHeaders());

app.use("*", (c, next) => {
  const corsMiddlewareHandler = cors({ origin: c.env.ORIGINS });
  return corsMiddlewareHandler(c, next);
});

app.get("/", async (c) => {
  const ip = getConnInfo(c).remote.address;
  const slug = c.req.query("slug");
  if (!ip || !slug || typeof slug !== "string") {
    return c.json({ msg: "invalid request" }, 400);
  }

  const valid = Object.fromEntries(
    c.env.SLUGS.map((slug) => Array.isArray(slug) ? slug : [slug, c.env.EMOJIS])
  );
  if (!valid[slug]) {
    return c.json({ msg: "invalid slug" }, 400);
  }

  const uid = await hashed(ip);
  const queried = await c.env.DB.batch<any>([
    c.env.DB.prepare("SELECT emoji, count FROM counts WHERE slug = ?").bind(slug),
    c.env.DB.prepare("SELECT emoji FROM reactions WHERE slug = ? AND uid = ?").bind(slug, uid),
  ]);
  const counts = new Map(queried[0].results.map((row) => [row.emoji, row.count]));
  const reacted = new Set(queried[1].results.map((row) => row.emoji));

  const reaction = Object.fromEntries(
    valid[slug].map((emoji) => [emoji, [counts.get(emoji) || 0, reacted.has(emoji)]]),
  );

  return c.json(reaction);
});

app.post("/", async (c) => {
  const ip = getConnInfo(c).remote.address;
  const { slug, target, reacted } = await c.req.json();
  if (!ip || !slug || !target || typeof slug !== "string" || typeof target !== "string" || typeof reacted !== "boolean") {
    return c.json({ msg: "invalid request" }, 400);
  }

  const valid = Object.fromEntries(
    c.env.SLUGS.map((slug) => Array.isArray(slug) ? slug : [slug, c.env.EMOJIS])
  );
  if (!valid[slug]) {
    return c.json({ msg: "invalid slug" }, 400);
  }

  const uid = await hashed(ip);
  const alreadyReacted = await c.env.DB.prepare(
    "SELECT count(*) AS cnt FROM reactions WHERE slug = ? AND uid = ? AND emoji = ?",
  )
    .bind(slug, uid, target)
    .first<number>("cnt");

  if (reacted) {
    if (alreadyReacted) {
      return c.json({ msg: "already reacted" }, 400);
    }
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO reactions (slug, uid, emoji) VALUES (?, ?, ?)",
      ).bind(slug, uid, target),
      c.env.DB.prepare(
        `INSERT INTO counts (slug, emoji, count) VALUES (?, ?, 1)
         ON CONFLICT(slug, emoji) DO UPDATE SET count = count + 1`,
      ).bind(slug, target),
    ]);
  } else {
    if (!alreadyReacted) {
      return c.json({ msg: "not reacted" }, 400);
    }
    await c.env.DB.batch([
      c.env.DB.prepare(
        "DELETE FROM reactions WHERE slug = ? AND uid = ? AND emoji = ?",
      ).bind(slug, uid, target),
      c.env.DB.prepare(
        `UPDATE counts SET count = count - 1 WHERE slug = ? AND emoji = ?`,
      ).bind(slug, target),
    ]);
  }

  return c.json({ success: true });
});

export default app;
