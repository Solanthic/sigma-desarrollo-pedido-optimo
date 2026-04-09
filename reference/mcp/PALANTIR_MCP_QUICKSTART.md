# Palantir MCP Quickstart

Use this when an agent needs fast guidance on whether to reach for Palantir MCP and how to use it safely.

## What To Use It For

- Foundry-specific context
- docs and API references for Palantir tooling
- dataset, schema, and lineage inspection
- ontology search and governed ontology changes
- repo-aware help for Foundry projects

## When Not To Use It

- general web search
- generic code editing without any Foundry context
- direct production ontology edits
- overwriting existing datasets unless the workflow explicitly supports creation or safe replacement

## Agent Workflow

1. Identify whether the task touches Foundry, Palantir docs, datasets, ontology, or SDKs.
2. Ask Palantir MCP for context before making assumptions.
3. Read docs or schema first when the task involves an unfamiliar platform pattern.
4. Prefer read-only tools before write tools.
5. Use branch or proposal flows for ontology changes.
6. Keep the scope minimal and act only after the relevant context is clear.

## Good First Prompts

- "Use Palantir MCP to get context for this Foundry project."
- "Search the Foundry docs for the recommended pattern."
- "Inspect the dataset schema and summarize the important fields."
- "Find the ontology object type that matches this concept."
- "Create a branch and propose the ontology change."

## Operating Rules

- Treat token permissions as the access boundary.
- Do not assume Palantir MCP is the right tool for every ontology task; use the platform-specific workflow that matches the asset.
- If the task involves docs, repo context, and platform actions, gather context first and only then make changes.
- Prefer the smallest tool set that answers the question.

## One-Line Summary For Prompts

Palantir MCP is the Foundry-aware context and action layer. Use it first for docs, datasets, lineage, ontology, and repo-aware Foundry work, then act cautiously with read-only-first and branch/proposal workflows.

See [`PALANTIR_MCP_GUIDE.md`](./PALANTIR_MCP_GUIDE.md) for the full reference.
