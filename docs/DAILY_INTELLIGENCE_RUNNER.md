# Sapiver Daily Intelligence — private runner

Public login URL after runner installation:
https://suite.sapiverpress.co.uk/daily-brief/runner/

The page reuses the existing `daily-news-intelligence.yml` and `release-daily-newsletter.yml` GitHub Actions. Publishing is always an explicit action.

## One-time configuration

In Netlify, open the existing **sapiverpress-puzzle-suite** project (site ID 47bda30e-4698-4cf5-bcd4-d59785e1f399). Add these as secret environment variables for **Functions** in **production**:

1. **DAILY_RUNNER_PASSWORD** — unique, strong password of at least 16 characters.
2. **DAILY_RUNNER_GITHUB_TOKEN** — a fine-grained token limited to sapiverpress-studio/SapiverForge, with Actions: Read and write and Contents: Read-only. This token is server-side only and is not entered on the login form.

The Comic dispatch remains the responsibility of the existing release workflow using its existing CROSS_REPO_GITHUB_TOKEN secret. Do not transfer that secret into the browser.

After creating the Netlify environment variables, redeploy the isolated install workflow if necessary to activate them.

## Editorial handoff

The runner only labels an edition **Daily brief edited** if both candidate files in GitHub are valid and an explicit reviewer marker exists at:
`news-intelligence/YYYY-MM-DD/runner-review.json`

That JSON must contain:
- `date` matching the edition.
- `status`: `verified`.
- `candidate_id`: the exact ID in the edition manifest.
- `brevo_draft_verified`: `true` only after inspecting and correcting the actual Brevo draft.
- `manifest_blob_sha`: the GitHub contents SHA of the corrected `manifest.json`.
- `newsletter_blob_sha`: the GitHub contents SHA of the corrected `newsletter-metadata.json`.
- `reviewed_at`: an ISO timestamp.

The marker must be written only AFTER the corrected repository edition and Brevo draft have been verified. The runner does not claim to verify Brevo itself: it uses the recorded review plus the current draft metadata to protect the release button.

When the operator clicks **Deploy approved**, the site dispatches `release-daily-newsletter.yml` with `confirm=SEND`. That existing workflow is responsible for the newsletter, website and approved Comic publication. The runner reports GitHub workflow status but individual social channel receipts still need checking in Comic.

## Safety

No password or GitHub API token is committed to source code. Missing credentials fail closed. The login cookie is HttpOnly, Secure and SameSite Strict. All workflow changes remain in GitHub, and the isolated runner deployment never sends a newsletter or triggers Comic.
