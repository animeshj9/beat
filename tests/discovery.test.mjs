import test from "node:test";
import assert from "node:assert/strict";
import { discover } from "../server/discovery.mjs";
import { sqliteStore } from "../server/store.mjs";
test("full discovery validates search evidence and suppresses a repeated crawl", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only";
  const store = sqliteStore(":memory:");
  let calls = 0;
  const url = "https://example.org/notice/1";
  const candidate = {
    entityId: "hyd example park",
    title: "A park reopens",
    summary: "A park is open again after repairs.",
    category: "parks",
    latitude: 17.42,
    longitude: 78.34,
    newState: "Open",
    effectiveDate: null,
    confidence: 0.9,
    significance: 0.8,
    sources: [
      {
        title: "Park notice",
        url,
        publishedAt: new Date().toISOString(),
        excerpt:
          "The municipal notice states that repairs are complete and the park has reopened.",
      },
    ],
  };
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls++;
    const payload = body.tools
      ? {
          status: "completed",
          output: [
            { type: "web_search_call", action: { sources: [{ url }] } },
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "A documented park reopening.",
                  annotations: [{ type: "url_citation", url }],
                },
              ],
            },
          ],
        }
      : {
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    events: [
                      candidate,
                      {
                        ...candidate,
                        entityId: "bad evidence",
                        sources: [
                          {
                            ...candidate.sources[0],
                            url: "https://invented.example/false",
                          },
                        ],
                      },
                    ],
                  }),
                },
              ],
            },
          ],
        };
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  try {
    const p = {
      name: "Financial District",
      latitude: 17.42,
      longitude: 78.34,
      radius: 5,
    };
    assert.deepEqual(await discover(p, store), { accepted: 1, rejected: 1 });
    assert.deepEqual(await discover(p, store), { accepted: 0, rejected: 1 });
    assert.equal((await store.all()).length, 1);
    assert.equal(calls, 4);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    await store.close();
  }
});
