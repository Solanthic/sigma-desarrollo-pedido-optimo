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

## Working Style

**Scope first, then plan, then build.** Never jump straight to execution. Follow this workflow for any non-trivial task:

1. **Scope** — What should we create? List the candidates, evaluate tradeoffs, and propose what to tackle next. Present options to the user.
2. **Plan** — Once the user picks a direction, design the approach. Use `/plan` for implementation tasks. Iterate on the approach with the user before writing anything.
3. **Build** — Execute the agreed plan. Ship incrementally — small, reviewable chunks.
4. **Verify** — Confirm the output works (query it, test it, validate schemas). Show the user the result.

**Do NOT:**
- Start creating Foundry resources (object types, datasets, transforms, syncs) without explicit user alignment on what to create and how
- Assume the next step — always present the menu of options and let the user decide priority
- Batch multiple creation steps silently — each significant creation should be scoped, agreed, then executed

**DO:**
- Present a clear "here's what we CAN do next" list when transitioning between tasks
- Ask the user which item to tackle before diving in
- Use plan mode for anything that touches Foundry resources or multi-step implementations
- Keep the progress log updated after completing major work

## AI FDE Skill

Use `/ai-fde <task>` to orchestrate Palantir AI FDE via browser automation. Claude Code acts as meta-orchestrator (planning, context, decisions) while AI FDE executes inside Foundry (creating objects, writing transforms, running builds).

**Key capabilities** (beyond MCP): write Python transforms, manage code repos, run builds, Pipeline Builder, OSDK React apps.

**Requirements**: Chrome must be closed before starting (Playwright uses the Chrome profile for passkey auth). Foundry host: `salimentos-ia.palantirfoundry.com`.

**Language rule**: All ontology display names, API names, and descriptions must be in Spanish. API names use Spanish camelCase (codigoSap, nombreTienda). See `.claude/skills/ai-fde/skill.md` for the full protocol.

## Ontology

The `ontology/` folder contains Palantir Foundry ontology definitions (YAML) for the Pedido Optimo domain:

- `ontology/object_types/` — 18 object type definitions
- `ontology/link_types/links.yaml` — 22 relationship definitions
- `ontology/action_types/` — 7 action type definitions (user/AI-initiated mutations)
- `ontology/OVERVIEW.md` — human-readable summary with coverage matrix

Use `/ontology` in Claude Code to interactively scope, refine, or extend the ontology. The batch agent prompt is at `scripts/ontology-agent.md`.
