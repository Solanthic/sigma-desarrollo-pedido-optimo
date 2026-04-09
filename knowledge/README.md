# Knowledge Base

Reusable engineering outcomes — patterns, approaches, design rationale, and decision records that inform future work.

## What Goes Here

Cross-cutting engineering patterns that are **not specific to one domain folder**:
- **Engineering approaches**: Incremental sync strategies, retry patterns, Foundry transform patterns
- **Tool recipes**: How to profile datasets via MCP, how to use AI FDE effectively
- **Lessons learned**: What didn't work and why, tradeoffs we evaluated

## What Does NOT Go Here

Domain-specific knowledge belongs in its domain folder:
- Ontology knowledge (backing maps, design decisions, follow-ups) → `ontology/`
- Data architecture (source rules, readiness, mappings) → `data/`
- Ontology definitions (YAML) → `ontology/`
- Legacy reference code → `reference/`
- Task-specific working notes → `tasks/`
- Project management → `data/commercial-strategy/`

## File Structure

Each file is a standalone knowledge artifact, named by topic (not date):

```markdown
# {Topic Name}

## Summary
One-paragraph description of this knowledge.

## Context
When/why this was discovered. Link to the source task(s).

## Details
The actual knowledge — approach, patterns, configuration, tradeoffs.

## Source
- [Task](../tasks/YYYY-MM-DD-task-name/TASK.md) that produced this
```

## How Knowledge Grows

```
tasks/2026-04-10-sellout-sync/
  └── TASK.md (outcome: "daily delta sync works, full rebuild weekly")
        └── extracted to → knowledge/incremental-table-builds.md
```

Use `/wrap-up` when completing a task to extract knowledge interactively.
