# SapiverPrints public catalogue (GitHub-fed)

## Source of truth and secret separation
- Only the Etsy shop SapiverPrints is used; the old puzzle shop is excluded.
- Etsy public API key and shared secret remain in **SapiverForge GitHub Actions secrets**. They are never included in Netlify or the public catalogue.
- `.github/workflows/etsy-prints-check.yml` reads active listings with photos every four hours (UTC: 00:17, 04:17, 08:17, 12:17, 16:17, 20:17) and supports a manual dispatch.
- The workflow writes a strictly whitelisted `data/etsy-public-catalog.json`: Etsy listing ID, title, short description, first public photo and alt text, canonical Etsy purchase URL, date and shop name. No customers, credentials, orders, or supplier data.
- A GitHub Actions failure **does not overwrite** the last successful snapshot. A missing image/partial inventory fails rather than publishing a partial catalogue.
- The public feed is served from GitHub's **public main branch** at `https://raw.githubusercontent.com/sapiverpress-studio/SapiverForge/main/data/etsy-public-catalog.json`.

## Netlify site
- `netlify/functions/etsy-prints.mjs` reads the GitHub public feed and validates every listing and its freshness; no Netlify Etsy credentials are required.
- The website continues calling `/api/etsy-prints` so the client does not need changing.
- Feed max age: **5.5 hours**. The HTTP cache never extends beyond expiration. GitHub Actions scheduling can be delayed; on an overdue or unavailable feed, the website **fails closed** and shows the existing official Etsy link rather than potentially stale product data.
- New Etsy listings normally appear after the next successful GitHub sync plus GitHub CDN propagation. Do not promise instant appearance.
- Keep the Netlify build/deploy manual. The feed refresh workflow **never deploys Netlify**.

## Verification and recovery
1. Run `node test/etsy-prints-contract.mjs` and `node test/shop-page-contract.mjs` (after generating the shop page).
2. Check GitHub Actions `SapiverPrints public catalogue refresh` has a successful run and that `data/etsy-public-catalog.json` has current `generatedAt` and expected items.
3. Only then make **one** complete Netlify suite deployment, using the existing approved full-site procedure. Do not replace the site with a partial `public/` folder.
4. Visit `https://suite.sapiverpress.co.uk/api/etsy-prints`. It must report `shop: SapiverPrints`, real items and valid images. Then check `https://suite.sapiverpress.co.uk/shop/`.
5. If the endpoint returns 503, check age of public feed, GitHub sync, GitHub raw availability and Netlify function logs. Never bypass stale-feed checks to mask failures.

## Pinterest handoff (future separate work)
The same public feed can support a dedicated Sapiver Prints publisher using the Comic repository's existing Pinterest API access, with a board-specific queue and Etsy-listing-ID deduplication. Pinterest posting has **not** been enabled by this catalogue change.

## 2026-10-20 — Automatic Pinterest after active Etsy listing detection (STAGED)
- Owner goal: Every newly published SapiverPrints Etsy listing receives its own Pin with original Etsy listing image, short description and direct listing link, without additional owner action.
- Etsy read-only check is scheduled twice hourly (minute :07 and :37 UTC). Successful verified active-listing changes refresh/commit the sanitised feed, then dispatch the Comic Pinterest backlog workflow with the existing CROSS_REPO_GITHUB_TOKEN. GitHub failing a commit prevents dispatch. Dispatch failure appears as a failed Forge run; Comic hourly schedule provides fallback.
- The new pure catalogue-change helper suppresses unnecessary 30-minute timestamp-only commits. Unchanged feed is still refreshed at 4 hours, before the 5.5-hour expiry applied by the public shop and Comic. Description/photo updates refresh feed immediately. Unverified/draft/private listings are not shared.
- Comic limits each batch to 20 Pins with 30 seconds between posts, and existing listing-ID receipts/remote-board checks stop repeat Pins. Existing music videos, newsletters, Etsy uploader, PrintShrimp, and site deployment process are untouched.
- Timing: generally within 30 minutes plus GitHub scheduling, Etsy API propagation and Pinterest latency; not guaranteed instantaneous. Cross-repo dispatch success, real Pins and backlog drain still require live verification.
- Files: .github/workflows/etsy-prints-check.yml, .github/workflows/test-shop.yml, scripts/check-etsy-prints.mjs, lib/etsy-pinterest-sync.mjs, test/etsy-pinterest-handoff.test.mjs.

## Release confirmation — 2026-10-20 05:21 BST
- PR #137 squash merged to main as c1ed51892d54090244a01d82a15413cc637d810c with [skip netlify]. Verify Shop page run 39368895795 SUCCESS: existing shop/retailer/Etsy tests passed and eight of eight new handoff tests passed.
- First live SapiverPrints catalogue run 39369033723 SUCCESS: correct existing Etsy shop, all 32 published products with approved public images, fresh timestamp 2026-10-20T04:21:39.014Z committed to main. No new product IDs in that run, so the new cross-repository Comic dispatch was correctly skipped. The ability to hand off a future NEW product is implemented but not yet verified live.
- Paired Comic PR #43 merged after freshness confirmation. Its push-triggered first batch run is 39369252389; actual Pinterest Pin success and receipt persistence must be verified separately. Not an instant Etsy webhook: half-hour API check + GitHub queue time.
- No Netlify deployment, Etsy write, Pinterest credentials relocation, PrintShrimp ordering or video-publishing changes. Documentation update [skip netlify] avoids additional release.

## 2026-10-20 — Catalogue freshness + cross-repo publication repair (TESTING; NO LIVE DISPATCH)
- Audit: 32 active published Etsy products and 32 durable Comic Pin receipts. Last successful public feed written 2026-10-20T09:37:56Z; later Etsy refresh run 39439605045 was cancelled during actions/checkout after the job's eight-minute timeout; Comic Pinterest run 39445633977 failed safely on stale 5.5-hour feed. No duplicate posting or Etsy write observed.
- Changed public feed refresh threshold from four hours to one hour while keeping 30-minute scheduled Etsy GET checks, strict public schema validation and Comic's 5.5-hour maximum validity; raised Etsy GitHub runner timeout from eight minutes to twenty minutes to tolerate slow checkout. No auto-pin from stale feed.
- Existing CROSS_REPO_GITHUB_TOKEN generated HTTP 403 for GitHub Actions workflow_dispatch to Comic on 2026-10-19, and its Etsy handoff previously used the same token. Added lib/cross-repo-dispatch.mjs: first attempt Actions dispatch, then only on certain 403/404 failures try repository_dispatch using Contents:write if present. Fail visibly with actionable Actions:write OR Contents:write permission instructions if both fail. No token reads or writes, no new credentials.
- Existing verified owner-approved Daily Brief release and no-Netlify retry use pinned edition date + full candidate ID + source commit SHA + SEND, and must NEVER automatically bypass human approval. No newsletter or social publish is authorised by this code-only change.
- The retired Forge/Clearforge Pinterest boards are deliberately not re-created by approved social publishing: Comic sets FORGE_PINTEREST_DISABLED=true for the Forge publisher; its existing Facebook/YouTube/Instagram paths remain gated by approved release. Sapiver Prints listing Pins and separate paid-owner video uploads remain unchanged.
- State: code staged on branch fix/forge-social-publication-handoffs-20261020; CI, merge, token's alternative Contents:write ability and first genuine new-product handoff still unverified. Only ship after PR CI. Existing Netlify release unchanged.

## 2026-10-20 — Second-stage fix: pinned freshly committed Etsy snapshot (STAGED)
- Verified live run 39459506377 SUCCESS on repaired 20-minute Etsy check, refreshed validated 35 active Etsy listings and feed generated at 2026-10-20T16:41:59.234Z. Found three new active listing IDs. CROSS_REPO_GITHUB_TOKEN successfully used Contents:write repository_dispatch fallback; Comic run 39459746620 proves dispatch delivery. Closed redundant permission probe PR #139 without merging.
- Unexpected remaining race: Comic started five seconds after Forge dispatch and fetched stale cached raw.githubusercontent.com /main Etsy catalogue, rejected with 'Public Etsy feed stale or future-dated', safely posted nothing. A freshly pushed, verified feed commit does not immediately invalidate raw /main CDN caches. This is NOT an expired Pinterest OAuth or missing dispatch token.
- Fix in lib/cross-repo-dispatch.mjs and .github/workflows/etsy-prints-check.yml: pass git rev-parse HEAD AFTER successful feed commit/push as the exactly 40-hex feed_sha on BOTH Actions and repository-dispatch routes. Never send arbitrary URLs/listing IDs. Comic pins the raw feed to this immutable commit and still enforces exact SapiverPrints shop, active IDs, verified images, freshness, posting receipts and 20-item cap.
- Unit tests lock SHA and fail closed for malformed payloads; no Netlify software release, Etsy write or video change. Need merge Comic pinned-source receiver FIRST, then Forge sender; run a genuine one-time fresh source validation and verify three outstanding product Pin receipts before claiming full coverage.

## 2026-10-20 17:52 BST — Publication/social handoff fix RELEASED; 35/35 product Pins VERIFIED
- Initial repair PR #138 merged as 1fe8d8ae51e01a044dc8d5aea49bb194832fd110. Both Shop and Daily News PR checks passed. Etsy check runner timeout 20 minutes, public-feed renewal every one hour with 30-minute API checks; new GitHub Actions 403 to Contents-scoped repository_dispatch fallback. Source Daily Brief publishing remains SEND-gated; legacy Forge Pinterest channel deliberately disabled while Facebook/YouTube/Instagram are preserved.
- Live Etsy refresh 39459506377 SUCCESS, feed 35 ACTIVE items at 2026-10-20T16:41:59Z, three new listing IDs; authenticated CROSS_REPO_GITHUB_TOKEN Contents-scoped repository_dispatch SUCCESS. Closed redundant no-op diagnostic PR #139 without merging. First Comic fallback run 39459746620 failed safely on old raw /main CDN cache, no Pins created.
- Immutable feed repair PR #140 merged as 1ec41ad1adc59dffeeebf33c856b47106e5ec7fa; paired Comic PR #52 had already merged as d76b38917402091ef3125c51d1697f39d102dff9. Hand-off now sends exact 40-hex freshly committed Git HEAD feed SHA after successful catalogue push; receiver reads that immutable commit, validates freshness and dedups listings. Forge workflow run 39460890286 success. No Netlify build or Etsy write.
- Live Comic run 39460853324 SUCCESS: published THREE new Pin IDs for Roe Deer 4599438228 -> 1038924207812671466; Badger 4599437738 -> 1038924207812671471; Red Squirrel 4599399281 -> 1038924207812671483. Its result created=3 found=0 pending=0, and durable Comic receipts now cover 35 of 35 active listings; no missing.
- Outstanding: Next owner-approved Daily Brief SEND must demonstrate the corrected per-edition Facebook, YouTube and Instagram receipts. Do NOT send now without authorisation; no website/email campaign produced or sent in this repair. Previous 2026-10-19 site vs latest candidate mismatch remains a HOLD for re-release pending exact candidate reconciliation, never re-send by guess. Failure alerts and real Etsy/PrintShrimp order fulfilment are separate follow-ups.
- This documentation-only update uses [skip netlify] and must not trigger a new paid production deployment.
