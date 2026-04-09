# Agents

Batch agent prompt templates for sub-agent delegation or long autonomous runs.

## Skills vs Agents

| | Skills (`.claude/skills/`) | Agents (`agents/`) |
|---|---|---|
| **Invocation** | `/command` in Claude Code | Sub-agent delegation or manual copy |
| **Mode** | Interactive — conversation with user | Batch — single-pass autonomous run |
| **Output** | Incremental, reviewed in real-time | Comprehensive report or artifact set |

## Available Agents

### `ontology-batch.md`
Reads data model documentation and generates complete ontology YAML definitions under `ontology/`. Designed for bulk regeneration or major ontology redesigns.

**Inputs**: `data/readiness/TABLE_INVENTORY.md`, `reference/DISCOVERY.md`
**Outputs**: `ontology/object_types/*.yaml`, `ontology/link_types/links.yaml`, `ontology/action_types/*.yaml`

### `data-profiler.md`
Systematically profiles all available Foundry datasets against TABLE_INVENTORY.md expectations. Produces a structured data quality report.

**Inputs**: `data/readiness/TABLE_INVENTORY.md`, Palantir MCP
**Outputs**: Data quality report (schema matches, row counts, null rates)

### `sync-validator.md`
Compares local ontology YAML definitions against live Foundry state. Produces an actionable diff of what needs to be created, updated, or investigated.

**Inputs**: `ontology/**/*.yaml`, Palantir MCP
**Outputs**: Ontology drift report (missing objects, property mismatches, link gaps)
