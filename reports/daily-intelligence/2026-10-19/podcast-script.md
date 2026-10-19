# Intel D270: 160GB on Intel's card, up to 480GB through partners

Intel's inference-focused GPU D270 is a useful example of why headline hardware specifications require careful reading.

## What Intel announced

At the Open Compute Project conference on 12 October 2026, Intel provided more details about the GPU D-series, previously known as Crescent Island. It is an air-cooled PCIe inference accelerator built around Intel's Xe3P architecture, with a 350-watt power envelope and quoted peak figures of 1.5 terabytes per second of memory bandwidth and 1.3 petaflops of FP8 compute.

But there is an important detail behind the most attention-grabbing specification. Intel's own card has 160 gigabytes of LPDDR5X memory. Partners can design cards with up to 480 gigabytes. These are different product configurations, not 480 gigabytes guaranteed on every D270.

## Why use LPDDR5X?

Large language model inference uses memory to hold model weights and increasingly long contexts. A card with more usable memory could run some workloads that would otherwise require multiple accelerators. Intel's design places significant emphasis on capacity and standard air-cooled server infrastructure.

HBM-equipped accelerators can offer higher memory bandwidth. The question is whether Intel's memory capacity, compute and energy profile produce a useful cost and latency trade-off for specific inference jobs. That cannot be answered by comparing gigabytes alone.

## What we cannot yet conclude

Intel's stated bandwidth and compute figures are specifications, not independent end-to-end measures of tokens served, latency under load, total system cost or reliability. Intel says customer sampling is under way. The public announcement does not establish widespread commercial availability, independent benchmark superiority, or a lower price per generated token.

For a buyer evaluating accelerators, the sensible comparison would use the same models, context lengths, quantisation settings, batching and software stacks, while recording throughput, latency, power, memory use and hardware cost.

## Sapiver Forge's read

The interesting strategy is not that speed no longer matters. It is that many AI inference workloads can be constrained by different resources at different stages. A high-capacity option may improve some workloads even when it is not the fastest GPU in isolation.

That distinction is useful beyond hardware. Whenever a vendor advertises a striking headline number, check which configuration it describes, whether the product is shipping, and whether the evidence is based on independent tests or the vendor's own numbers.

Sources: Intel Newsroom's 12 October 2026 GPU D-series announcement, and ServeTheHome's technical breakdown.
