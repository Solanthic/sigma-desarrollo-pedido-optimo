# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**sigma-desarrollo-pedido-optimo** — Engineering workspace for building the Pedido Optimo (Optimal Ordering) system on Palantir Foundry for Sigma Alimentos Mexico. See `README.md` for project overview.

## Repository Structure

```
tasks/           Task workspaces — each engineering task gets a dated folder with TASK.md
knowledge/       Reusable engineering outcomes — patterns, decisions, approaches
ontology/        Palantir Foundry ontology definitions (YAML source of truth)
data/            Data landscape — readiness reports, mappings, business logic
  readiness/     Data audit: TABLE_INVENTORY, DATA_READINESS_REPORT, DATASET_MAPPING
  logic/         Business computation rules: COMPUTATION_GRAPH
  commercial-strategy/  Symlink to business canon in commercial-strategy repo
reference/       Legacy archive (read-only) — discovery docs, SQL, notebooks, MCP guides
agents/          Agent prompt templates for batch/autonomous operations
scripts/         Executable automation scripts
.claude/skills/  Interactive Claude Code skills (invoked with /command)
```

## Task Workflow

All non-trivial work follows this flow:

1. **`/task <description>`** — Interactively scope, plan, and scaffold a new task
2. **Work** — Execute the delivery plan. All artifacts go in the task folder.
3. **`/wrap-up`** — Close the task, extract knowledge, update progress

Tasks live in `tasks/YYYY-MM-DD-task-name/`. Each has a `TASK.md` with goal, value, definition of done, delivery plan, and status.

## Working Style

**Scope first, then plan, then build.** Never jump straight to execution.

1. **Scope** — What should we create? List the candidates, evaluate tradeoffs, and propose what to tackle next. Present options to the user.
2. **Plan** — Once the user picks a direction, design the approach. Use `/plan` for implementation tasks. Iterate on the approach with the user before writing anything.
3. **Build** — Execute the agreed plan. Ship incrementally — small, reviewable chunks.
4. **Verify** — Confirm the output works (query it, test it, validate schemas). Show the user the result.

**Do NOT:**
- Start creating Foundry resources without explicit user alignment on what to create and how
- Assume the next step — always present the menu of options and let the user decide priority
- Batch multiple creation steps silently — each significant creation should be scoped, agreed, then executed

**DO:**
- Present a clear "here's what we CAN do next" list when transitioning between tasks
- Ask the user which item to tackle before diving in
- Use plan mode for anything that touches Foundry resources or multi-step implementations
- Keep the progress log updated after completing major work

## Cross-Repo Context: Commercial Strategy

Business and technical canons live in a **separate repo**:

- **Repo**: `/Users/alfonsogarrido/Documents/GitHub/commercial-strategy`
- **Pedido Optimo folder**: `customers/sigma-alimentos/projects/pedido-optimo/`
- **Symlink**: [`data/commercial-strategy/`](./data/commercial-strategy/) points to the above folder
- **Progress log**: [`data/commercial-strategy/progress-log.md`](./data/commercial-strategy/progress-log.md) — single source of truth for outcomes, decisions, and milestones. **Update this file when completing major work.**

Key subfolders:
- `use-case/business/` — problem, scope, operating model, users, metrics, risks
- `use-case/technical/` — systems landscape, data sources, integrations, architecture
- `interactions/` — meeting notes from discovery sessions
- `progress-log.md` — what has been done (ontology, data readiness, sync strategy)

When working on data pipeline design, ontology decisions, or business rule implementation, **read the relevant canon files first**.

## Skills

| Command | Purpose |
|---------|---------|
| `/task <desc>` | Interactive task architect — scope, plan, scaffold a new task |
| `/wrap-up` | Close a task — capture outcome, extract knowledge, update progress |
| `/ontology` | Interactive ontology design and refinement |
| `/ai-fde <task>` | Orchestrate Palantir AI FDE via browser automation |
| `/data-profiler` | Profile Foundry datasets via MCP — schema, stats, quality |
| `/sync-validator` | Compare local ontology YAML vs live Foundry state |
| `/foundry-docs <topic>` | Search Palantir Foundry docs via MCP — synthesized, contextualized answers |
| `/repo-health` | Audit repo structure, broken refs, stale tasks, convention compliance |
| `/pdf <file>` | Convert markdown to PDF with Mermaid support |

## Agents

Batch agent prompts in `agents/` for sub-agent delegation:

| Agent | Purpose |
|-------|---------|
| `ontology-batch.md` | Bulk ontology YAML generation from data documentation |
| `data-profiler.md` | Systematic profiling of all available datasets |
| `sync-validator.md` | Comprehensive ontology drift report |

## Ontology

The `ontology/` folder contains Palantir Foundry ontology definitions (YAML):

- `ontology/object_types/` — 18 object type definitions
- `ontology/link_types/links.yaml` — 22 relationship definitions
- `ontology/action_types/` — 12 action type definitions
- `ontology/OVERVIEW.md` — human-readable summary with coverage matrix

Use `/ontology` for interactive refinement. Use `agents/ontology-batch.md` for bulk regeneration.

## AI FDE

Use `/ai-fde <task>` to orchestrate Palantir AI FDE via browser automation. Claude Code acts as meta-orchestrator (planning, context, decisions) while AI FDE executes inside Foundry.

**Key capabilities** (beyond MCP): write Python transforms, manage code repos, run builds, Pipeline Builder, OSDK React apps.

**Requirements**: Chrome must be closed before starting (Playwright uses the Chrome profile for passkey auth). Foundry host: `salimentos-ia.palantirfoundry.com`.

## Conventions

- **Language rule**: All ontology display names, API names, and descriptions must be in Spanish. API names use Spanish camelCase (codigoSap, nombreTienda). See `.claude/skills/ai-fde/skill.md` for the full protocol.
- **Foundry host**: `salimentos-ia.palantirfoundry.com`
- **MCP guides**: See `reference/mcp/PALANTIR_MCP_GUIDE.md` for tool families and safe patterns. Quick reference at `reference/mcp/PALANTIR_MCP_QUICKSTART.md`.

## Environment

- `.env` must define `FOUNDRY_TOKEN` or the variable must already be exported
- `node_modules/` must be installed (`npm install`)
- MCP smoke test: `node scripts/test-palantir-mcp.mjs`
