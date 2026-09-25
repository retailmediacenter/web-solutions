# Web Solutions — PROJECT_HANDOVER (V43.2.1 server foundation)

## Architectural invariants
- React/Node generator, Advisor owns business meaning, goals and module plan. Business Registry owns facts and asset namespaces for 72 business entries, never design, CTA, renderers or section ordering.
- Commerce is independent of primary site goal; Booking can be independent or part of Hybrid; Preview and ZIP must retain parity across business types. Five visual styles do not alter common system-modal behavior. Serbian copy for local users.
- Booking Manager is an independent Vite PWA for iOS, Android and desktop browsers. Preserve IndexedDB calendar, profiles, durations, availability, proposals, WhatsApp/Viber response composition. Do NOT recreate the manager.
- Free site includes working forms and RMC attribution, not merely a demo. V44: remaining UX reconciliation and Welcome carousel derived from existing IZDVAJAMO data.

## Local sources and remote caution
- This working tree was reconstructed from the conversation ZIP `web-solutions-react-node za Boba(2).zip`; original V39.5 images and five missing V41.6 images restored solely for running the local test suite.
- GitHub `retailmediacenter/web-solutions` `main` and `v43-booking-test` were queried for `server/src/app.js`, both returning 404. This does NOT establish that branches/repo are missing, only that the path wasn't retrievable. Do not push or deploy until the real GitHub tree, Render root/build settings and source revisions have been verified.
- Redis `rmc-booking-queue` is reportedly configured on Render; no live Redis credentials were accessed, and no live integration check was made.

## Changes implemented in this patch (SERVER ONLY)
- `server/src/booking-queue.js`: Upstash REST adapter, cryptographically random 12-char `XXXX-XXXX-XX` pairing code (10 symbols + two hyphens), atomic one-time claim via Redis `GETDEL`, separate cryptographic 256-bit manager bearer token stored only as SHA-256 hash on Redis. Public site ID contains no bearer token.
- `server/src/booking-routes.js`: express router exposing pairing, claim, request submission, manager poll and confirmed-save acknowledgement. Queue items have independent 72-hour TTL; Redis sorted-set index; Lua EVAL atomic dedup by UUID, 250-record maximum per site; manager authenticated on polling and ack. Minimal IP throttle protects public endpoints; additional abuse protection/captcha may be necessary before public launch.
- `server/src/app.js`: mounts `/api/booking` and allows Authorization in configured CORS headers. `CLIENT_ORIGIN` must include manager and generator origins for their authorized cross-site requests. Static exported-site POST CORS must be engineered/tested in the generator integration phase; don't deploy before that.
- `server/test/booking-queue-v4321.test.mjs`: offline security/flow tests; no secrets or external requests.

## REST contracts (not connected to UI yet)
1. `POST /api/booking/pairings` => `{siteId,pairingCode,expiresIn}`. Pairing expires in 30 minutes. Only initiate during trusted export flow in the final integration; right now route is developer-stage and IP-limited, NOT ready for general Internet exposure.
2. `POST /api/booking/pairings/claim` JSON `{pairingCode}` => `{siteId,accessToken}`. Store token privately in Manager's local IndexedDB after explicit consent. One-time code cannot be reused.
3. `POST /api/booking/requests` JSON `{siteId,booking:{requestId,clientName,phone,serviceName,date,time,duration,note}}` => HTTP 202 `{requestId,duplicate}`. Public requestId must be a UUID for retries. CORS from exported site remains outstanding.
4. `GET /api/booking/requests/:siteId` with `Authorization: Bearer <accessToken>` => `{requests:[...]}`. Poll when PWA is open, online and visible; don't promise background delivery on closed mobile PWAs.
5. `POST /api/booking/requests/:siteId/:requestId/ack` same bearer auth => `{ok:true}`; Manager MUST await successful local IndexedDB transaction and only then ACK. Treat received requestId as the idempotency key on-device.

## Work remaining to finish V43.2.1
- Verify actual GitHub branches and Render deployed API code. Determine correct path without assuming ZIP layout matches GitHub root. Keep production and test branches separate.
- Add safe CORS for published sites. Pin/verify API HTTPS URLs via configuration, no secrets inside ZIP. Protect public issuance against mass abuse before production.
- Modify generator export to create pairing code **only** when site actually has Booking; show code in export UI, embed only `siteId` + public API base in downloaded static site. Beware: generation on preview must NOT silently issue codes. Handle retry/export failed downloads (codes expire) and branch publish separation.
- Modify Manager settings UI to accept up to 12-char code and persist `siteId`+`accessToken` per business profile. Add polling, local transactional dedup and ACK, explicit network/expiry UX. Provide re-pair/recovery and multiple-device policy. Keep existing functions; phase out long encrypted links only after full system passes regression tests.
- Map the actual Booking runtime fields to the server request schema without changing unrelated modules.
- End-to-end local exported site -> test Render -> test Upstash -> Booking Manager installed on iPhone, then repeat Android/desktop and offline/retry tests.
- When operational, switch generator to production domain `https://retailmediacenter.com/web-solutions/` using environment config rather than hardcoded URLs.

## Test evidence
With original images restored in temporary local test tree, `npm test` ran 121 tests and passed 121. This verifies offline unit/regression tests ONLY, not running Render, GitHub synchronization or a live Upstash request. Included two new offline queue tests passed. No original source ZIP files were changed.
