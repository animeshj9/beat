# Architecture

The Expo app owns guest preferences and displays events. The API owns facts and state history. The discovery job researches changes and proposes structured candidates; validation decides which enter the store. The client contains no provider credential and cannot start paid discovery.

## Flow

1. An operator runs `npm run crawl` or the protected discovery endpoint.
2. Web search researches several local categories using known entity states as context.
3. Structured extraction returns candidate states and evidence references.
4. Validation requires in-radius coordinates, valid category, sufficient model confidence, a recent publication date and source URLs found in the search response.
5. The store compares normalised states with the entity's latest event. Unchanged observations are suppressed. A new transition links the previous state and receives a deterministic transition ID.
6. The client retrieves geographically filtered events. Shared ranking combines proximity, significance, model confidence and age. Feedback, category selection and last visit further filter the view.

## Persistence and concurrency

SQLite WAL is the zero-setup local mode. A synchronous insert and latest-state read keep a transition atomic inside one Node process. Run a single API/crawler process against a local SQLite database. Use Postgres for multiple workers: advisory transaction locks serialize each entity's state transition and an event ID constraint prevents duplicate insertion. Each discovery run logs completion / failure and validation rejection counts. Raw provider transcripts are not stored.

## Trust and limitations

Do not equate a search citation with proven truth. The source URL is checked against provider evidence, and a short paraphrase is retained for inspection. A human should assess precision and novelty on both dogfood regions. Coordinate selection and entity matching still depend on the model. Names or status paraphrases can cause duplicate events; entity aliases and a reviewed canonical state vocabulary are the next useful improvements. Explicit state reversals are supported.

The feed should favour silence over quota-filling. No synthetic event is written to the live database. A network error in live mode preserves the cached real feed and displays an error.

## Deployment

Run Node 24 with a persistent volume or PostgreSQL, behind HTTPS. Configure the client API URL at bundle time. Run discovery on a controlled schedule independently of client requests. Restrict the admin token and model key to the server. The default server binds loopback; widening the bind address is an explicit local-testing step.

## Technical references

- Expo SDK compatibility: https://docs.expo.dev/versions/latest/
- Expo builds: https://docs.expo.dev/build/introduction/
- Responses web search: https://developers.openai.com/api/docs/guides/tools-web-search
- Structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Nominatim policy: https://operations.osmfoundation.org/policies/nominatim/
