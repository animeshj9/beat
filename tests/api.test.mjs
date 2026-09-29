import test from "node:test";
import assert from "node:assert/strict";
import { createServer, authorized } from "../server/index.mjs";
import { sqliteStore } from "../server/store.mjs";
test("admin discovery authentication fails closed", () => {
  assert.equal(authorized(undefined, undefined), false);
  assert.equal(authorized("Bearer x", "y"), false);
  assert.equal(authorized("Bearer secret", "secret"), true);
});
test("API validates feed queries and blocks unauthorised discovery", async () => {
  const store = sqliteStore(":memory:");
  const server = createServer(store);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let r = await fetch(`${base}/health`);
    assert.equal(r.status, 200);
    r = await fetch(`${base}/api/feed?lat=17.42&lon=78.34&radius=5`);
    assert.deepEqual((await r.json()).events, []);
    r = await fetch(`${base}/api/feed?radius=5`);
    assert.equal(r.status, 400);
    r = await fetch(`${base}/api/discover`, { method: "POST" });
    assert.equal(r.status, 401);
    r = await fetch(`${base}/api/places?q=x`);
    assert.equal(r.status, 400);
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
