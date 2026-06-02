---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer grounded in [docs/SPEC.md](../../docs/SPEC.md) and [docs/ROADMAP.md](../../docs/ROADMAP.md).

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

Pay special attention to: actual vs estimate separation, IAM principal scoping, CUR/Athena prerequisites, and v0.1 scope boundaries.

Once we reach shared understanding, record the decisions and their reasoning as an ADR under `docs/adr/` (filename: `NNNN-<slug>.md`, sequential number).
