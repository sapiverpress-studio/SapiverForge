# Sapiver Daily Intelligence Runner — standalone private site

## Sites

- PUBLIC, **no password**: https://suite.sapiverpress.co.uk
- PRIVATE (SSO/team login until credentials are configured): https://sapiver-daily-intelligence-runner.netlify.app
- New private Netlify project: https://app.netlify.com/projects/sapiver-daily-intelligence-runner
- Netlify project ID: `7461afca-61ae-4221-8495-b2e0d02e43fc`

The private site is deployed from `private-runner/public`, with only its dedicated Netlify function in `private-runner/netlify/functions`. It is not part of the public suite's deploy directory or functions. No public page uses a site-wide password.

## Password and GitHub token

Configure ONLY in the private Netlify project, production Functions scope:
- `DAILY_RUNNER_PASSWORD`: choose a unique password at least 12 characters. The private login is enforced by the function, not by a password on the public suite.
- `DAILY_RUNNER_GITHUB_TOKEN`: fine-grained token limited to `sapiverpress-studio/SapiverForge` with Actions read/write and Contents read-only.

Netlify visitor access is currently set to SSO/team login for every private runner deployment. This is a temporary second layer; do not disable it until the private login works.

## Daily operation

1. Sign in and click Run Workflow to dispatch `daily-news-intelligence.yml`.
2. The page checks GitHub Actions run and review ZIP artifact for download.
3. After correcting the repository data **and** the Brevo draft, the reviewer writes `news-intelligence/YYYY-MM-DD/runner-review.json` containing date, candidate_id, status verified, brevo_draft_verified true, and the exact current GitHub blob SHA values for manifest and newsletter metadata.
4. The private runner unlocks Deploy Approved only when the candidate and draft metadata match that verified review record.
5. Deploy Approved dispatches `release-daily-newsletter.yml` with `confirm=SEND`. Its existing workflow handles the site, Brevo send and Comic handoff.

## Deployment safeguards

- `.github/workflows/install-daily-brief-runner.yml` deploys only the standalone private runner on ordinary updates.
- The public-suite cleanup is gated to the **single initial relocation commit**. It uses the exact previously published public-site snapshot, minus runner files/function. Future runner deploys cannot redeploy the public website.
- No release workflow runs during runner installation or relocation.
- A workflow dispatch acknowledgment is not confirmation of a completed release. Individual Comic channel receipts remain separately verifiable.


## Corrected ZIP upload and publication source

The private runner offers **Upload corrected ZIP** immediately after the original GitHub ZIP download. This dispatches `.github/workflows/import-reviewed-daily-brief-zip.yml` through the existing Actions-only token, without granting Netlify write access to GitHub Contents. The upload function rejects files over 40 KB, non-ZIP files and mismatched SHA-256 values. The Actions importer checks the ZIP directory, rejects traversal paths, symlinks, duplicate files, invalid checksums and oversized decompressed entries.

**Two accepted editorial package types:**

- **Review-only ZIP**, including `corrected-daily-brief.md`, `corrected-newsletter-preview.html` and `verification-report.json` with `editorial_status=source_checked_draft_not_publication_ready`. It is recorded under the edition's `reviewed-upload/` directory. The publishing button stays locked. **The 6 November reviewed_draft ZIP is of this type.**
- **Complete publication ZIP**, with exact dated `news-intelligence/YYYY-MM-DD/` canonical files (manifest, newsletter HTML/Markdown, social copy, metadata, source evidence and review) plus the complete dated `reports/daily-intelligence/YYYY-MM-DD/` candidate with five matching media hashes. The manifest must be internally sealed and publish-ready; uploaded metadata must be unsent and unapproved. The workflow imports the uploaded files as the source of truth, creates/updates an **unsent Brevo draft**, checks that the remote HTML matches the uploaded newsletter, creates `runner-review.json` bound to Git blob hashes and leaves the final **Deploy approved** click to the site owner.

No ZIP, including a source-checked draft, can bypass the existing daily story/media requirements. No automatic email sends, website deployments or Comic handoffs occur from the import workflow.

For the initial version, the ZIP is limited to **40 KB compressed**, enough for the usual editorial text bundles. Larger audio/video ZIPs are explicitly rejected and would need a separate chunked-upload/storage design.

The importer places review content in the existing **public** `SapiverForge` GitHub repository, not in a private storage service. Do not upload passwords, personal data or unpublished confidential material in the ZIP.

