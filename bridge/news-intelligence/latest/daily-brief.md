# Sapiver Forge Daily Brief

Today we are looking at major AI infrastructure funding, an appealable German court ruling on fraudulent ads, and fresh questions about how coding assistants handle repository data.

## 1. Crusoe hits $30.9B valuation as AI infrastructure race intensifies

**Confirmed:** AI infrastructure provider Crusoe raised $3.9 billion in Series F funding at a $30.9 billion post-money valuation. Crusoe says the money will support expansion of large-scale AI campuses and its modular Spark data-centre units.

**Why it matters:** The round shows how much capital is flowing into the physical infrastructure needed to train and run large AI systems, alongside investment in models and software.

**Sapiver Forge interpretation:** Crusoe is pursuing both very large campuses and smaller modular capacity. The funding is evidence of investor demand for AI infrastructure, not proof that any one deployment model will dominate.

**Source:** [Reuters](https://www.reuters.com/business/ai-infrastructure-provider-crusoe-valued-309-billion-latest-funding-round-2026-09-17/) · confidence 95%

## 2. German court finds Meta liable for fraudulent ads

**Confirmed:** The Frankfurt Regional Court ruled that Meta can be held directly liable for fraudulent investment ads distributed on Facebook and Instagram because its advertising system actively ranks and targets paid ads rather than merely hosting third-party content. The ruling can be appealed.

**Why it matters:** The judgment tests how EU hosting protections apply when a platform algorithmically distributes paid advertising, but it is a regional-court decision and does not by itself establish an EU-wide rule.

**Sapiver Forge interpretation:** If upheld, the decision could increase legal pressure on platforms to police paid-ad delivery systems more closely. Its wider significance will depend on appeals and how other courts treat similar cases.

**Source:** [Reuters](https://www.reuters.com/legal/litigation/german-court-rules-meta-liable-fake-ads-instagram-facebook-2026-09-17/) · confidence 90%

## 3. ZCode patches Git-history upload behaviour after security report

**Confirmed:** A security researcher reported that ZCode could upload workspace snapshot data, including Git history, to Z.ai servers during Repo Wiki or indexing activity without sufficiently clear disclosure. Z.ai said the uploads were associated with Repo Wiki generation, said uploaded data was destroyed after processing, and released a patch while committing to a third-party security audit.

**Why it matters:** The report and vendor response show why developers need explicit controls and clear disclosure when coding tools send repository context to cloud services.

**Sapiver Forge interpretation:** The exact scope and trigger conditions are disputed, so it is safer to describe this as a transparency and data-handling issue than as proven malicious exfiltration.

**Source:** [blog.ferstar.org](https://blog.ferstar.org/en/posts/zcode-silent-workspace-snapshot-upload/) · discovered via Hacker News · confidence 90%

## 4. Anthropic adopts AGENTS.md spec for Claude Code

**Confirmed:** Anthropic added AGENTS.md support to Claude Code 2.1.277. The file can provide repository instructions when no CLAUDE.md is present. OpenAI previously contributed the AGENTS.md format to the Agentic AI Foundation.

**Why it matters:** Standardisation is rarely exciting, but for developers juggling multiple AI agents, having a common way to tell those agents how to behave is a practical step toward reducing configuration headaches.

**Sapiver Forge interpretation:** Support from another major coding agent reduces setup friction for teams that use more than one tool and gives the shared convention broader practical reach.

**Source:** [Thomas Claburn/The Register](https://www.theregister.com/ai-and-ml/2026/09/18/anthropic-decides-to-support-openais-markdown-instructions-spec/5297588) · discovered via Techmeme · confidence 90%

## Practical takeaway

If you use AI coding assistants, verify which repository data can be uploaded, which feature triggers it and how long the provider retains it. For platform teams, treat the Frankfurt Meta judgment as a specific, appealable ruling about paid-ad distribution—not a settled Europe-wide rule on algorithmic content.

## What to watch next

Watch for any appeal in the Meta case, Z.ai's promised third-party audit and further detail on the scope of ZCode uploads, and whether other coding assistants adopt AGENTS.md.

---

Sapiver Forge separates confirmed reporting from interpretation. Source links are provided so you can inspect the underlying reporting.
