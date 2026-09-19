# Sapiver Forge Daily Brief

Today we look at the messy reality of AI integration: from coding agents that overshare your secrets to the quiet, expensive machinery of infrastructure and the ongoing tug-of-war over digital taxes.

## 1. ZCode agent caught oversharing local Git history

**Confirmed:** Security researcher ferstar found that Z.ai’s ZCode agent automatically uploaded full local repository snapshots, including sensitive .git history and LFS caches, to Alibaba Cloud. Z.ai has apologised, citing a default-enabled 'Repo Wiki' feature, and promised a patch and third-party audit.

**Why it matters:** This incident highlights the significant privacy risks when AI coding tools are granted broad access to local environments, potentially exposing internal secrets or deleted API keys without the user's explicit intent.

**Sapiver Forge interpretation:** It is a stark reminder that 'convenience' features in AI agents often come with a hidden cost to data sovereignty. Developers should treat these tools as untrusted third parties until they have verified exactly what data is leaving their machine.

**Source:** [blog.ferstar.org](https://blog.ferstar.org/en/posts/zcode-silent-workspace-snapshot-upload/) · discovered via Hacker News · confidence 95%

## 2. Crusoe hits $30.9B valuation in massive infrastructure raise

**Confirmed:** AI infrastructure provider Crusoe has secured $3.9 billion in Series F funding, bringing its post-money valuation to $30.9 billion. The round was backed by major players including Nvidia, Mubadala Capital, and Founders Fund.

**Why it matters:** The scale of this investment underscores the immense capital requirements for the physical infrastructure—data centres and power—that underpin current AI development.

**Sapiver Forge interpretation:** The market is betting heavily that the bottleneck for AI will remain physical capacity for some time, justifying these eye-watering valuations for infrastructure providers.

**Source:** [Reuters](https://www.reuters.com/business/ai-infrastructure-provider-crusoe-valued-309-billion-latest-funding-round-2026-09-17/) · confidence 90%

## 3. EU pauses digital services tax to await global consensus

**Confirmed:** European Commissioner Wopke Hoekstra confirmed the EU will delay a bloc-wide digital services tax on big tech firms while it exhausts efforts for an international solution via the OECD.

**Why it matters:** This delay avoids immediate trade friction with the US, but the pressure remains as France and other member states continue to push for national revenue streams if global negotiations stall.

**Sapiver Forge interpretation:** The EU is clearly trying to avoid a fragmented tax landscape, but the clock is ticking; if the OECD process doesn't yield results soon, the bloc may be forced to act unilaterally to satisfy domestic revenue demands.

**Source:** [Financial Times](https://www.ft.com/content/e5a76494-71df-4ee0-a85f-b28f2c94ded6) · discovered via Techmeme · confidence 85%

## 4. The rise of the independent AI safety auditor

**Confirmed:** A feature in The Verge details the growing influence of third-party safety organisations like METR, Redwood Research, and Apollo Research, which are increasingly tasked with evaluating models following high-profile misalignment incidents at major labs.

**Why it matters:** As AI labs struggle with internal safety failures, these independent bodies are becoming the de facto gatekeepers for assessing whether models are safe enough for public release.

**Sapiver Forge interpretation:** It is a sign of a maturing industry that we are moving away from 'trust us' towards external verification, though the effectiveness of these audits remains a work in progress.

**Source:** [Hayden Field/The Verge](https://www.theverge.com/ai-artificial-intelligence/996563/ai-safety-research-metr-redwood-openai-anthropic?view_token=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6Im9WRlFMVXFOcDciLCJwIjoiL2FpLWFydGlmaWNpYWwtaW50ZWxsaWdlbmNlLzk5NjU2My9haS1zYWZldHktcmVzZWFyY2gtbWV0ci1yZWR3b29kLW9wZW5haS1hbnRocm9waWMiLCJleHAiOjE3OTAwNzgwNzYsImlhdCI6MTc4OTY0NjA3Nn0.uqC7_g7QOvm2irjweDneh4zzkSalQCFKxlgKwM-Q1Ms) · discovered via Techmeme · confidence 80%

## Practical takeaway

Review the permissions and default settings of any AI coding agents currently running in your local environment; if they have access to your entire repository, assume they might be sending more than just code to the cloud. For enterprise leaders, keep an eye on the shifting landscape of AI infrastructure costs, as the capital intensity of these projects is only increasing.

## What to watch next

Monitor the promised third-party audit of ZCode to see if it establishes a new standard for transparency in AI developer tools, and watch for any updates on the OECD tax talks that might force the EU's hand on digital levies.

---

Sapiver Forge separates confirmed reporting from interpretation. Source links are provided so you can inspect the underlying reporting.
