# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**sigma-desarrollo-pedido-optimo** — Project under initial development. Update this file as architecture, build commands, and conventions are established.

## MCP Smoke Test

Use `node scripts/test-palantir-mcp.mjs` to verify that the local `palantir-mcp` server can start, complete an MCP `initialize` handshake, and list tools.

Environment:

- `FOUNDRY_TOKEN` is read from `.env` or the current shell environment
- `FOUNDRY_API_URL` overrides the default Foundry host used by `scripts/palantir-mcp`
- `MCP_TEST_TIMEOUT_MS` controls the smoke test timeout in milliseconds

Requirements:

- `.env` must define `FOUNDRY_TOKEN` or the variable must already be exported
- `node_modules/` must be installed

## Palantir MCP Guide

See [`PALANTIR_MCP_GUIDE.md`](./PALANTIR_MCP_GUIDE.md) for the high-level usage guide, tool families, and safe operating patterns for agents.

For a shorter prompt-oriented summary, see [`PALANTIR_MCP_QUICKSTART.md`](./PALANTIR_MCP_QUICKSTART.md).

## Cross-Repo Context: Commercial Strategy

Business and technical canons for Pedido Optimo live in a **separate repo** that should be consulted for business logic, scope decisions, retailer-specific rules, and project planning:

- **Repo**: `/Users/alfonsogarrido/Documents/GitHub/commercial-strategy`
- **Pedido Optimo folder**: `customers/sigma-alimentos/projects/pedido-optimo/`
- **Symlink**: [`context/commercial-strategy/`](./context/commercial-strategy/) points to the above folder
- **Progress log**: [`context/commercial-strategy/progress-log.md`](./context/commercial-strategy/progress-log.md) — single source of truth for outcomes, decisions, and milestones. **Update this file when completing major work.**

Key subfolders:

- `use-case/business/` — problem, scope, operating model, users, metrics, risks
- `use-case/technical/` — systems landscape, data sources, integrations, architecture, transformation/ontology scope
- `interactions/` — meeting notes from discovery sessions (March 2026)
- `progress-log.md` — what has been done (ontology, data readiness, sync strategy)

When working on data pipeline design, ontology decisions, or business rule implementation, **read the relevant canon files first** — they contain context that is not duplicated in this repo.

## Ontology

The `ontology/` folder contains Palantir Foundry ontology definitions (YAML) for the Pedido Optimo domain:

- `ontology/object_types/` — 18 object type definitions
- `ontology/link_types/links.yaml` — 22 relationship definitions
- `ontology/action_types/` — 7 action type definitions (user/AI-initiated mutations)
- `ontology/OVERVIEW.md` — human-readable summary with coverage matrix

Use `/ontology` in Claude Code to interactively scope, refine, or extend the ontology. The batch agent prompt is at `scripts/ontology-agent.md`.
