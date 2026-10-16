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
