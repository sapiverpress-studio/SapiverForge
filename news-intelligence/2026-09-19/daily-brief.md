# Sapiver Forge Daily Brief

Today we are looking at the heavy lifting of AI infrastructure, the messy reality of platform liability, and a reminder that your coding assistant might be more curious about your work than you intended.

## 1. Crusoe hits $30.9B valuation as AI infrastructure race intensifies

**Confirmed:** AI infrastructure provider Crusoe Inc. has secured $3.9 billion in Series F funding, bringing its valuation to $30.9 billion. The capital is earmarked for expanding large-scale AI campuses and its modular 'Spark' data center containers.

**Why it matters:** The massive scale of this funding highlights the ongoing, capital-intensive scramble to build the physical infrastructure required to support high-demand AI workloads.

**Sapiver Forge interpretation:** Investors are betting heavily that the bottleneck for AI will remain compute capacity, prioritising companies that can deploy modular, transportable data centres quickly.

**Source:** [Reuters](https://www.reuters.com/business/ai-infrastructure-provider-crusoe-valued-309-billion-latest-funding-round-2026-09-17/) · confidence 95%

## 2. German court finds Meta liable for fraudulent ads

**Confirmed:** The Frankfurt Regional Court ruled that Meta is directly liable for fraudulent third-party investment ads on its platforms, rejecting the company's defence that it acts only as a passive host under the EU Digital Services Act. The court cited Meta's algorithmic ad ranking as evidence of active involvement.

**Why it matters:** This ruling challenges the 'safe harbour' protections that major platforms have long relied upon, potentially forcing a significant rethink of how algorithmic ad distribution is managed in Europe.

**Sapiver Forge interpretation:** If this precedent holds, Meta and other platforms may find that their own recommendation engines are a legal liability rather than just a revenue driver.

**Source:** [Reuters](https://www.reuters.com/legal/litigation/german-court-rules-meta-liable-fake-ads-instagram-facebook-2026-09-17/) · confidence 90%

## 3. ZCode AI tool caught silently uploading Git histories

**Confirmed:** Security analysis revealed that the ZCode AI coding assistant was silently uploading local Git commit histories to cloud servers during indexing. Vendor Z.ai has apologised, deployed a patch to stop the background uploads, and promised a third-party security audit.

**Why it matters:** Developers often treat local Git histories as private; the silent exfiltration of this data to a cloud provider for 'documentation' purposes is a significant privacy and security failure.

**Sapiver Forge interpretation:** It is a stark reminder that 'AI-powered' convenience features often come with hidden data-sharing behaviours that users never explicitly authorised.

**Source:** [blog.ferstar.org](https://blog.ferstar.org/en/posts/zcode-silent-workspace-snapshot-upload/) · discovered via Hacker News · confidence 95%

## 4. Anthropic adopts AGENTS.md spec for Claude Code

**Confirmed:** Anthropic has updated Claude Code to support the AGENTS.md instruction file format, allowing the agent to parse repository rules and conventions automatically. This format was originally contributed by OpenAI to the Agentic AI Foundation.

**Why it matters:** Standardisation is rarely exciting, but for developers juggling multiple AI agents, having a common way to tell those agents how to behave is a practical step toward reducing configuration headaches.

**Sapiver Forge interpretation:** Even in a competitive market, vendors are finding that interoperability is a necessary feature to keep developers from switching tools.

**Source:** [Thomas Claburn/The Register](https://www.theregister.com/ai-and-ml/2026/09/18/anthropic-decides-to-support-openais-markdown-instructions-spec/5297588) · discovered via Techmeme · confidence 85%

## Practical takeaway

If you are using AI coding assistants, check your repository permissions and consider what data is being indexed; do not assume local files remain local. For enterprise leaders, the German court ruling on Meta suggests that algorithmic curation is increasingly being treated as active editorial control, which may impact how you manage third-party content on your own platforms.

## What to watch next

Keep an eye on the fallout from the German Meta ruling, as it could set a precedent for how other European courts interpret platform liability for AI-driven content. Additionally, monitor whether the AGENTS.md standard gains wider adoption across other coding assistants to simplify cross-platform workflows.

---

Sapiver Forge separates confirmed reporting from interpretation. Source links are provided so you can inspect the underlying reporting.
