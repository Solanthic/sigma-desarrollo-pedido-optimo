---
name: sync-validator
description: Compare local ontology YAML definitions against live Foundry state via Palantir MCP. Use when the user wants to check for drift between the designed ontology and what's actually deployed.
---

# Ontology Sync Validator

You compare the local ontology YAML definitions (source of truth for design) against the live Foundry ontology (source of truth for deployment). The goal is to catch drift — things that exist locally but not in Foundry, things in Foundry but not locally, and mismatches between the two.

---

## Prerequisites

- Palantir MCP must be connected
- Local ontology definitions in `ontology/object_types/`, `ontology/link_types/links.yaml`, `ontology/action_types/`

## How It Works

### 1. Load Local Definitions

Read all YAML files from the ontology folder:
- `ontology/object_types/*.yaml` — extract apiName, properties (name + type), primaryKey, tags
- `ontology/link_types/links.yaml` — extract all link apiNames, from/to objectTypes, cardinality
- `ontology/action_types/*.yaml` — extract apiName, parameters, rules

### 2. Fetch Foundry State

Use Palantir MCP tools to get the live ontology:

```
mcp__palantir-mcp__search_foundry_ontology  — find all object types in the ontology
mcp__palantir-mcp__view_foundry_object_type — get details for each object type
mcp__palantir-mcp__view_foundry_link_type   — get details for each link type
mcp__palantir-mcp__view_foundry_action_type — get details for each action type
```

First get the ontology RID:
```
mcp__palantir-mcp__get_foundry_ontology_rid
```

### 3. Compare and Produce Diff

For each category, produce a structured comparison:

#### Object Types
| Status | Object Type | Details |
|--------|-------------|---------|
| Missing in Foundry | Store | Exists in YAML but not deployed |
| Missing in YAML | LegacyReport | Exists in Foundry but not in local design |
| Property mismatch | Product | Local has 12 properties, Foundry has 10. Missing: X, Y |
| Type mismatch | SellOut.quantity | Local: Integer, Foundry: Long |
| Synced | RetailChain | All properties match |

#### Link Types
| Status | Link | Details |
|--------|------|---------|
| Missing in Foundry | storeToProduct | Not deployed |
| Cardinality mismatch | ... | Local: many-to-one, Foundry: many-to-many |
| Synced | ... | Matches |

#### Action Types
| Status | Action | Details |
|--------|--------|---------|
| Missing in Foundry | approveRecommendation | Not deployed |
| Parameter mismatch | ... | Different parameter set |
| Synced | ... | Matches |

### 4. Summary and Recommendations

```markdown
## Sync Status Summary

- **Object Types**: {n} synced, {n} missing in Foundry, {n} missing in YAML, {n} mismatched
- **Link Types**: {n} synced, {n} missing, {n} mismatched
- **Action Types**: {n} synced, {n} missing, {n} mismatched

### Recommended Actions
1. {Create object type X in Foundry via /ai-fde or MCP branch}
2. {Update local YAML for Y to match Foundry (if Foundry is authoritative)}
3. {Investigate Z — exists in Foundry but not in design}
```

### 5. Save (Optional)

Offer to save the diff report to the current task folder if one is active.

---

## Key Behaviors

- **YAML is design truth, Foundry is deployment truth.** Differences can go either way — don't assume local is always right.
- **Be precise about mismatches.** "Properties don't match" is useless. "Local has `targetDaysOfSupply: Integer`, Foundry has `targetDaysOfSupply: Long`" is actionable.
- **Handle missing gracefully.** If MCP can't find an object type, it might not exist yet — that's the point of this tool.
- **Suggest next steps.** For each gap, recommend whether to use `/ai-fde` to create it in Foundry, or update the local YAML.
- **Check on branches too.** If there are open global branches, note that some objects might be in-flight.
