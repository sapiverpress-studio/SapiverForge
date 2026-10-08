# SapiverPrints Etsy shop synchronisation

## Target and safeguards
- Only the Etsy shop SapiverPrints: https://www.etsy.com/shop/SapiverPrints.
- The old Sapiver Press puzzle shop is deliberately excluded.
- All Etsy calls use documented public GET endpoints; no seller OAuth token is needed and no Etsy listing can be edited or published.
- No API key, secret, OAuth token or listing image is checked into GitHub.
- Amazon KDP book cards remain in data/shop-products.json.

## GitHub secrets (required for the daily monitor)
In the SapiverForge repo -> Settings -> Secrets and variables -> Actions:
- ETSY_PRINTS_KEYSTRING
- ETSY_PRINTS_SHARED_SECRET

The workflow .github/workflows/etsy-prints-check.yml runs at 05:15 UTC daily, manually via workflow_dispatch, and once on merge of that workflow to main. It verifies the exact shop and changes data/etsy-active-listing-ids.json only when listing IDs change. GitHub Actions' job summary shows counts, additions and removals. This is a monitoring snapshot, not a website product-data cache.

If the action fails with HTTP 401/403, inspect the Etsy developer app's approval/status and permissions. Check GitHub Actions secrets exist under the exact names. Never paste secret values in an issue or CI log. If git push is rejected, inspect repository branch protection and workflow token write permissions. Do not disable branch protection indiscriminately.

## Netlify configuration (separate from GitHub)
Site: Sapiver Press main suite (suite.sapiverpress.co.uk, currently sapiverpress-puzzle-suite).
Netlify -> Project configuration -> Environment variables:
- ETSY_PRINTS_KEYSTRING
- ETSY_PRINTS_SHARED_SECRET

Set the values for Functions runtime (production). GitHub Actions secrets are NOT inherited by Netlify. After setting or changing them, make a manual production deploy of the SapiverForge build to activate the new function; the existing site's automatic deploy is intentionally disabled.

Once deployed:
1. Visit https://suite.sapiverpress.co.uk/api/etsy-prints. Expect JSON with shop:"SapiverPrints" and items from published Etsy listings; credentials must not appear in the response.
2. Visit https://suite.sapiverpress.co.uk/shop/. The Etsy section should load the current product photographs, titles and purchase links. Amazon KDP book cards should stay unchanged.
3. Add a published listing to Etsy and allow approximately five minutes for the public catalogue to refresh. The site itself does not need redeploying for new Etsy listings.
4. If the Etsy API is unavailable, the website shows the official Etsy shop button instead of stale listing cards.

Etsy's API terms prohibit showing listing data older than six hours, so the function's success cache is only five minutes; errors use no-store. Neither the daily GitHub ID snapshot nor the static HTML supplies potentially stale Etsy titles, photographs or prices.

## Tests
Run node scripts/apply-trust-first-site.mjs, node test/shop-page-contract.mjs and node test/etsy-prints-contract.mjs from the repository root. The latter uses mocked responses and does not require credentials. A GitHub PR test workflow performs these checks.

## Remaining verification
Live Etsy credential validation can only be completed by the GitHub Action after merge/manual dispatch; the credentials are write-only secrets and cannot be read back from the connector. The Netlify API endpoint must separately be configured and manually deployed. Do not claim the live shop is connected until those checks succeed.
