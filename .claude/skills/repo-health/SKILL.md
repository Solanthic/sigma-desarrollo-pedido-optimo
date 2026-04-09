---
name: repo-health
description: Review repo structure, conventions, and hygiene. Use when the user wants to audit the repo for broken references, stale files, convention violations, or structural drift.
---

# Repo Health Check

You audit the sigma-desarrollo-pedido-optimo repo for structural integrity, convention compliance, and general tidiness. Think of this as a linter for the repo's organizational structure.

---

## How It Works

The user invokes `/repo-health`. You run through all checks and produce an actionable report.

## Checks

### 1. Structure Integrity

Verify the expected directory structure exists:
```
tasks/README.md
knowledge/README.md
ontology/README.md
ontology/OVERVIEW.md
ontology/FOLLOW_UPS.md
data/README.md
data/readiness/
data/logic/
data/commercial-strategy/  (symlink — verify it resolves)
reference/README.md
reference/DISCOVERY.md
reference/sql/
reference/notebooks/
reference/mcp/
agents/README.md
scripts/
.claude/skills/
```

Flag any missing directories or files.

### 2. Broken References

Scan all `.md` files for internal links (`[text](path)` and bare paths like `data/readiness/FILE.md`) and verify the targets exist. Report broken links with file and line number.

Also check:
- CLAUDE.md references to folders and files
- ontology/README.md references to agents/ontology-batch.md
- agents/ontology-batch.md references to data files
- Skill files referencing repo paths

### 3. Task Hygiene

Scan `tasks/` for:
- **Missing TASK.md**: Every task folder must have one
- **Stale in-progress**: Tasks marked `in-progress` for more than 7 days — flag for review
- **Missing outcome**: Completed tasks without an Outcome section filled in
- **Missing knowledge extraction**: Completed tasks without Knowledge Extracted section

### 4. Knowledge Base Health

Scan `knowledge/` for:
- **Orphaned files**: Knowledge files not linked from any task
- **Missing source links**: Knowledge files without a Source section
- **Stale content**: Files not updated in >30 days (might be outdated)

### 5. Ontology Consistency

Check `ontology/` for:
- **OVERVIEW.md freshness**: Does the count of object/link/action types in OVERVIEW.md match the actual YAML file count?
- **Link type references**: Every `from.objectType` and `to.objectType` in links.yaml must have a corresponding YAML file in object_types/
- **Action type references**: Every `objectType` referenced in action rules must exist
- **FOLLOW_UPS.md**: Are there unresolved follow-ups?

### 6. Convention Compliance

- **Naming**: Task folders follow `YYYY-MM-DD-kebab-case` pattern
- **Knowledge files**: Named by topic (not date), use kebab-case
- **Ontology YAML**: apiNames follow PascalCase (objects) / camelCase (properties, links, actions)
- **Spanish rule**: Spot-check that ontology displayName values are in Spanish

### 7. Gitignore Coverage

Verify these are in .gitignore:
- `.secrets/`, `.env`, `.mcp.json`, `.codex/`
- `.playwright-mcp/`, `.playwright-cli/`
- `__pycache__/`, `.ipynb_checkpoints/`

Check for files that probably shouldn't be tracked:
- Any `.env` files (not .env.example)
- Any files with "token", "secret", "credential" in the name
- Large binary files

### 8. Skill & Agent Completeness

- Every skill in `.claude/skills/` has a SKILL.md (or skill.md)
- Every agent in `agents/` is listed in `agents/README.md`
- CLAUDE.md skills table matches the actual skills present
- CLAUDE.md agents table matches the actual agents present

---

## Report Format

```markdown
# Repo Health Report
Generated: {date}

## Summary
- Checks passed: {n}/{total}
- Issues found: {n} ({n} critical, {n} warning, {n} info)

## Issues

### CRITICAL
{Issues that will cause breakage — broken refs, missing required files}

### WARNING
{Issues that indicate drift — stale tasks, incomplete knowledge, outdated counts}

### INFO
{Suggestions — convention improvements, hygiene tips}

## Recommendations
1. {Highest priority fix}
2. {Next priority}
...
```

---

## Key Behaviors

- **Be specific.** "Broken link" is useless. "data/README.md:12 links to `data/readiness/MISSING.md` which doesn't exist" is actionable.
- **Prioritize.** Critical issues first (broken refs, missing structure), then warnings (stale content), then info (nice-to-haves).
- **Offer to fix.** For simple issues (missing .gitignore entry, count mismatch in OVERVIEW.md), offer to fix them right away.
- **Don't over-flag.** A 2-day-old in-progress task is fine. A 30-day-old one is a flag.
