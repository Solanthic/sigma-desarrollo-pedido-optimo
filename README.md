# Sigma Desarrollo — Pedido Optimo

Engineering workspace for building the **Pedido Optimo** (Optimal Ordering) system on Palantir Foundry for Sigma Alimentos Mexico.

## What is Pedido Optimo?

An automated ordering recommendation engine that analyzes sell-out data, inventory levels, and transit information to generate optimal push/cut quantities for each store-SKU combination across retail chains (Walmart, Soriana, Chedraui, Sam's).

## Repository Structure

```
tasks/           Task workspaces — each engineering task gets a dated folder
knowledge/       Reusable engineering outcomes — patterns, decisions, approaches
ontology/        Palantir Foundry ontology definitions (YAML source of truth)
data/            Data landscape — readiness reports, mappings, business logic
reference/       Legacy archive — discovery docs, SQL queries, Python notebooks, MCP guides
agents/          Agent prompt templates for batch/autonomous operations
scripts/         Executable automation scripts
.claude/skills/  Interactive Claude Code skills (invoked with /command)
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your FOUNDRY_TOKEN

# Verify MCP connectivity
node scripts/test-palantir-mcp.mjs
```

## Working with Claude Code

This repo is designed for Claude Code workflows. Key skills:

| Command | Purpose |
|---------|---------|
| `/task <description>` | Start a new engineering task (interactive scope → plan → scaffold) |
| `/wrap-up` | Complete a task, extract knowledge, update progress |
| `/ontology` | Interactive ontology design and refinement |
| `/ai-fde <task>` | Orchestrate Palantir AI FDE via browser automation |
| `/data-profiler` | Profile Foundry datasets via MCP |
| `/sync-validator` | Compare local ontology YAML vs live Foundry state |
| `/pdf <file.md>` | Convert markdown to PDF |

See `CLAUDE.md` for full conventions and workflow details.

## Cross-Repo Context

Business requirements, project management, and stakeholder context live in a separate repo:

- **Symlink**: `data/commercial-strategy/` points to the Pedido Optimo folder in the `commercial-strategy` repo
- **Progress log**: `data/commercial-strategy/progress-log.md` — single source of truth for milestones

## Foundry Host

`salimentos-ia.palantirfoundry.com`
