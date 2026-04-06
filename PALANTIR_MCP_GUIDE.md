# Palantir MCP Guide

This repository uses Palantir MCP as a context and action layer for agents that need Foundry-aware help.

## What It Is

Palantir MCP is Palantir's Model Context Protocol server for AI IDEs and agents. It gives agents:

- repository and platform context
- documentation and code-snippet search
- controlled tools for Foundry resources, datasets, ontology, branches, and SDK workflows

Use it when the task involves Foundry, Palantir libraries, ontology work, datasets, or repo-specific context in a Foundry project.

## Important Distinction

Palantir MCP is the context-and-actions server for building and editing with Foundry.

Ontology MCP is a separate surface for ontology consumers that read and write ontology data through governed application scopes. When the task is about ontology data access for an external agent, use the product-specific Ontology MCP guidance rather than assuming Palantir MCP is the right tool.

## When To Use It

Use Palantir MCP first when you need to:

- understand a Foundry repository or internal library usage
- look up Foundry documentation or SDK references
- inspect datasets, schemas, or lineage
- search or modify ontology assets through the supported branch/proposal flow
- work with Python transforms, OSDK apps, or code repositories connected to Foundry

Do not use it as a generic web search tool. Prefer it for Palantir/Foundry-specific context and actions.

## Core Behavior

Palantir documents two main benefits:

- context for navigating internal Palantir libraries and Foundry architecture
- tools for exploring Foundry projects and taking actions

The docs also note that the MCP can recognize repository type and provide tailored context for:

- React OSDK repositories
- Python transform repositories
- TypeScript function repositories

## Tool Families

The available tools fall into these groups:

- Compass tools: list resources in a folder or project, inspect project imports
- Dataset tools: get schemas, run SQL queries, create new datasets, build datasets, inspect build status
- Data lineage tools: inspect resource graphs
- Ontology tools: search and inspect ontology objects, links, actions, and functions; create/update/delete ontology entities on branches
- Object set tools: query and aggregate ontology objects
- OSDK tools: fetch ontology SDK context and examples
- Platform SDK tools: list APIs and read API references
- Code repository tools: fetch repository context, create Python transform repos, create code repository pull requests
- Foundry branching tools: create/view/close branches and proposals
- Developer Console tools: connect repos, generate new ontology SDK versions, install SDK packages, inspect OSDK definitions
- Data connection tools: create REST API data sources and webhooks, manage egress policies
- Documentation search tools: search Foundry documentation and fetch transform/SDK docs

## Practical Agent Guidance

Use a discovery-first approach:

1. Ask for repository context before making assumptions about code structure or platform integration.
2. Search the relevant Foundry docs or SDK docs before implementing a new pattern.
3. For datasets, inspect schema and query results before proposing any change.
4. For ontology work, search first, then use the branch/proposal workflow for any lasting modification.
5. For generated or platform-managed assets, prefer the Palantir-provided tools instead of editing by hand.

## Safety Rules

- Treat the user's token and the external client as the security boundary for any data accessed through Palantir MCP.
- Treat ontology edits as branch/proposal work, not direct production changes.
- Prefer read-only tools before action tools.
- Avoid overwriting existing datasets unless the workflow explicitly creates a new one.
- Use the smallest tool scope that answers the question.
- If a task spans docs, repo context, and platform actions, gather context first and only then take action.

## Example Prompts

- "Use Palantir MCP to fetch code/API context for this project."
- "Search the Foundry documentation for the recommended pattern."
- "Show me the schema for this dataset and summarize the key columns."
- "Find the ontology object type that matches this business concept."
- "Create a new branch and propose the ontology change instead of modifying it directly."
- "Give me repository context for this Foundry project and explain the likely entry points."

## For This Repo

In this repository, Palantir MCP is most useful for:

- explaining Foundry and Palantir-specific behavior to agents
- looking up docs and API references before integrating with Palantir tooling
- guiding any future Foundry-connected code, ontology, or dataset work

The local smoke test is documented in [`CLAUDE.md`](./CLAUDE.md).

For a shorter agent-facing summary, see [`PALANTIR_MCP_QUICKSTART.md`](./PALANTIR_MCP_QUICKSTART.md).
