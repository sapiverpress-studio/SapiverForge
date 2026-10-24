# AWS's cloud capacity commitments: what is actually sold out?

Amazon's cloud business has made substantial commitments for capacity stretching into 2028. That sounds like a crisis for anyone building software, but the important words are **what kind of capacity**.

On 23 October, Amazon CEO Andy Jassy said that 2026 capacity had been sold, large capacity allocations for 2027 were largely committed, and a good portion of 2028 was already reserved. He made the comments in a conversation with Andreessen Horowitz.

But he immediately qualified that statement: AWS still reserves some capacity for on-demand EC2 and Bedrock customers. It would be wrong to report that nobody can start a new application on AWS until 2028. What he was describing was the demand for very large commitments of cloud infrastructure, particularly from artificial-intelligence developers.

## Why the distinction matters

Large AI labs can require very substantial, tightly coordinated allocations of data-centre power, networking, accelerators and memory. Such capacity must be planned well ahead of time. A team running a small website or a modest application has very different needs.

AWS is investing heavily in new data centres and infrastructure. Yet capacity still takes time to procure and commission. The forecasts therefore tell us something meaningful about pressure on suppliers and delivery schedules, but not the actual availability of one individual service in one AWS region tomorrow.

## The practical question for customers

If your business relies on large GPU clusters or a particular accelerator, contact your provider well before the planned workload and test alternative regions or instance families. Compare reserved capacity with on-demand options and ask about lead time, performance and total cost. If you are running a normal web app, look first at real capacity and prices for your service rather than making decisions from a dramatic headline.

It is also important not to equate a reserved capacity contract with usage. A reservation expresses an intention to purchase future capability, not proof that all reserved infrastructure has already been built or fully utilised.

## What this means for the AI sector

Jassy's comments fit a broader pattern in which AI infrastructure has become capital intensive and highly concentrated. Providers must take risks about how much hardware to install years before the revenue becomes certain. Meanwhile, customers competing for large clusters may need longer-term agreements.

The possible disadvantage for smaller entrants is not that cloud computing has stopped working. It is that the economics and availability of exceptionally large AI training or inference deployments may increasingly depend on negotiating capacity in advance.

## Sapiver Forge's assessment

This is a planning story, not a blanket warning that AWS is unavailable. The most useful lesson is to distinguish vendor-wide headlines from real availability for your own workload, then build in sensible alternatives rather than assuming one provider will always meet every request.

The reporting is from Reuters and The Information on 23 October, based on Jassy's public interview. We will watch whether future AWS earnings, deployment figures and customers' experience support these long-term capacity forecasts.
