# OpenCode's Console breach: Who needs to act?

OpenCode has disclosed a security incident involving a small, specific group of Console accounts. Here is what is confirmed, what remains uncertain, and how to respond without unnecessary alarm.

## What OpenCode says happened

On 17 October, OpenCode said a breach connected to what it called a large-scale distillation attack had affected 1.4 per cent of OpenCode Console users. That figure refers to the hosted Console service, not all developers using the OpenCode coding tool. According to the company, only Console accounts connected to external AI providers were involved. It said it emailed everyone in the affected group and was working with Anthropic, OpenAI and Google on remediation.

The company's public statement did not specify the number of exposed keys or describe the access obtained by the attackers in detail. Some people sharing what they say are notification emails report that stored provider keys may have been exposed. Those reports are a reason for affected users to act, but they should not be mistaken for a published forensic account.

## Why linked API keys matter

API keys can authorise requests to paid model services. If an attacker obtains a working key, they may be able to make requests that consume the key owner's credits or generate charges. That does not mean every OpenCode user is affected, or that an attacker gained access to every linked account's private data. The limits of the incident are still being investigated.

This is also a useful distinction between a tool running locally and credentials held in a hosted Console. Two products may share a name without sharing the same exposure.

## Who should do what?

If you received the breach notice, open each affected model provider's dashboard directly. Revoke and replace the linked API key, check recent usage and billing, and follow any incident instructions from that provider. Save evidence of suspicious charges and contact provider support if you find them. Changing the key inside a tool without revoking the old one at its issuer is not sufficient.

If you did not receive a notice, OpenCode says you were not in the affected group. You can still check which services hold credentials, apply restricted permissions and spending alerts, and use separate keys for separate tools. Avoid sharing long-lived, high-privilege keys when a narrower integration would work.

## What to watch next

The company has described the incident as ongoing. Further statements may clarify which data was actually accessed and whether provider-side remediation has invalidated affected credentials. Until those details are public, careful, targeted action is more useful than headlines suggesting that all API keys are compromised.

The bigger lesson is not that developer tools should never store credentials. It is that credentials should be scoped, revocable and monitored, and that a clear incident-response process matters when an integration fails.
