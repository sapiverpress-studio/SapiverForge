# The Git history you didn't mean to share

Z.ai's ZCode agent has been caught uploading sensitive local repository data to the cloud. We look at the privacy implications for developers and why 'convenience' features are often a security liability.

## The discovery

Security researcher ferstar recently pulled back the curtain on ZCode, Z.ai’s coding agent. What they found was, frankly, a bit alarming. The agent was automatically uploading full snapshots of local repositories to Alibaba Cloud. This wasn't just your current code; it included the entire .git history and Large File Storage caches. If you have ever accidentally committed an API key or a password and then deleted it, that sensitive data was likely being whisked away to a server you didn't authorise.

## The company response

Z.ai has since apologised, pointing the finger at a feature called 'Repo Wiki' that was enabled by default. It is the kind of corporate explanation that makes you wonder who thought that was a sensible default setting in the first place. They have promised a patch to stop the oversharing and have committed to a third-party audit. It is good that they are fixing it, but it is the sort of 'oops' moment that makes you question how much testing actually goes into these agentic features before they hit our machines.

## Why this matters

This incident is a stark reminder that when we give AI agents access to our local environments, we are essentially handing them the keys to the kingdom. We often focus on what the AI can do for us—writing functions, debugging, or refactoring—but we rarely stop to consider what the AI is doing with our data in the background. It highlights a massive privacy risk: these tools are often designed for maximum convenience, and that convenience frequently comes at the expense of our data sovereignty.

## The practical implication

The takeaway here is simple but inconvenient: treat your AI coding tools as untrusted third parties. Until you have verified exactly what data is leaving your machine, assume it is all being sent somewhere. If you are using ZCode or similar agents, check your settings immediately. If you cannot find a way to restrict what the agent sees, you might want to consider whether the convenience of an AI assistant is worth the risk of leaking your internal secrets.

## What to watch next

Keep an eye on that promised third-party audit. It is one thing to say you are fixing a security hole, but it is another to prove it. I will be watching to see if Z.ai actually publishes the findings of that audit or if it quietly disappears into the corporate ether. More broadly, watch how other AI coding tool providers respond. If they are smart, they will start being much more transparent about what their agents are 'seeing' and 'sharing' by default.
