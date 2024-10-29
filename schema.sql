CREATE TABLE IF NOT EXISTS counts (
  slug TEXT NOT NULL,
  emoji TEXT NOT NULL,
  count INTGER NOT NULL,
  PRIMARY KEY (slug, emoji)
);

CREATE TABLE IF NOT EXISTS reactions (
  slug TEXT NOT NULL,
  uid TEXT NOT NULL,
  emoji TEXT NOT NULL,
  PRIMARY KEY (slug, uid, emoji)
);
