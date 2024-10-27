import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { getConnInfo } from "hono/cloudflare-workers";

type Bindings = {
  ORIGINS: string[];
  EMOJIS: string[];
  SLUGS: (string | [string, string[]])[];
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", secureHeaders());

app.use("*", (c, next) => {
  const corsMiddlewareHandler = cors({
    origin: c.env.ORIGINS,
  });
  return corsMiddlewareHandler(c, next);
});

app.get("/", (c) => {
  const uid = getConnInfo(c).remote.address;
  const slug = c.req.query("slug");

  if (!slug || !uid || typeof slug !== "string") {
    return c.json({ msg: "invalid request" }, 400);
  }

  const valid = Object.fromEntries(
    c.env.SLUGS.map((slug) =>
      Array.isArray(slug) ? slug : [slug, c.env.EMOJIS],
    ),
  );

  if (!valid[slug]) {
    return c.json({ msg: "invalid slug" }, 400);
  }

  // TODO:
  const reacted = [];
  const counts = {};

  const reaction = Object.fromEntries(
    valid[slug].map((emoji) => [
      emoji,
      [counts[emoji] || 0, reacted.includes(emoji)],
    ]),
  );

  return c.json(reaction);
});

app.post("/", async (c) => {
  const uid = getConnInfo(c).remote.address;
  const { slug, target, reacted } = await c.req.json();

  if (
    !uid ||
    !slug ||
    !target ||
    typeof slug !== "string" ||
    typeof target !== "string" ||
    typeof reacted !== "boolean"
  ) {
    return c.json({ msg: "invalid request" }, 400);
  }

  const valid = Object.fromEntries(
    c.env.SLUGS.map((slug) =>
      Array.isArray(slug) ? slug : [slug, c.env.EMOJIS],
    ),
  );

  if (!valid[slug]) {
    return c.json({ msg: "invalid slug" }, 400);
  }

  // TODO

  return c.json({ success: true });
});

export default app;
