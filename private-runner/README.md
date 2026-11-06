# Sapiver Daily Intelligence — private runner

This directory is intentionally deployed only to the dedicated private Netlify project `sapiver-daily-intelligence-runner`, not the public Sapiver Press suite.

- Static UI: `public/index.html`
- Private server-side GitHub integration: `netlify/functions/daily-brief-runner.mjs`
- Netlify runtime secrets: `DAILY_RUNNER_PASSWORD` (minimum 12 characters) and `DAILY_RUNNER_GITHUB_TOKEN`
- Deployment workflow: `.github/workflows/install-daily-brief-runner.yml`
- Production publication is separate and requires an explicit approved action.

Do not commit credentials. The public site is not part of this runner's ordinary deploy workflow.
