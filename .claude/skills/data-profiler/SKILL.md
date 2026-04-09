---
name: data-profiler
description: Interactive Foundry dataset profiling via Palantir MCP. Use when the user wants to inspect a dataset's schema, run sample queries, check data quality, or compare against TABLE_INVENTORY expectations.
---

# Data Profiler

You profile Foundry datasets interactively using the Palantir MCP tools. Given a dataset name or RID, you fetch its schema, run sample queries, compute basic statistics, and compare against what the project's data documentation says should be there.

---

## Prerequisites

- Palantir MCP must be connected (verify with `mcp__palantir-mcp__search_foundry_projects` or similar)
- Reference docs at `data/readiness/TABLE_INVENTORY.md` and `data/readiness/DATASET_MAPPING.md`

## How It Works

### 1. Identify the Target

The user provides a dataset name, RID, or object type name. If they provide an object type, look up the backing dataset in `data/readiness/DATASET_MAPPING.md`.

### 2. Fetch Schema

Use `mcp__palantir-mcp__get_foundry_dataset_schema` to get the actual schema from Foundry. Display it in a readable table: column name, type, nullable.

### 3. Compare Against Documentation

Read `data/readiness/TABLE_INVENTORY.md` and find the matching table entry. Compare:
- **Column coverage**: Are all expected columns present? Any extras?
- **Type alignment**: Do types match expectations?
- **Missing columns**: Flag anything in the docs but not in the dataset

### 4. Run Sample Queries

Use `mcp__palantir-mcp__run_sql_query_on_foundry_dataset` to run profiling queries:

```sql
-- Row count
SELECT COUNT(*) as total_rows FROM dataset

-- Date range (for time-series data)
SELECT MIN(date_col) as earliest, MAX(date_col) as latest FROM dataset

-- Null rates for key columns
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN col1 IS NULL THEN 1 ELSE 0 END) as col1_nulls,
  ...
FROM dataset

-- Distinct counts for categorical columns
SELECT col, COUNT(*) as cnt FROM dataset GROUP BY col ORDER BY cnt DESC LIMIT 20

-- Sample rows
SELECT * FROM dataset LIMIT 5
```

Adapt queries to the specific dataset. Focus on what's most informative.

### 5. Produce Profile Report

Output a structured profile:

```markdown
## Dataset Profile: {name}

**RID**: {rid}
**Rows**: {count}
**Date range**: {min} to {max} (if applicable)

### Schema ({n} columns)
| Column | Type | Nullable | Nulls (%) | Distinct |
|--------|------|----------|-----------|----------|
| ...    | ...  | ...      | ...       | ...      |

### vs TABLE_INVENTORY
- Columns present: {n}/{total expected}
- Missing: {list}
- Extra: {list}
- Type mismatches: {list}

### Key Observations
- {notable finding 1}
- {notable finding 2}

### Data Quality Flags
- {any issues: high null rates, unexpected values, date gaps}
```

### 6. Save (Optional)

If the user is working inside a task folder, offer to save the profile there. Otherwise, just display it.

---

## Key Behaviors

- **Start with schema, then drill into data.** Don't run expensive queries blindly.
- **Compare against docs first.** The value is in spotting gaps between expectation and reality.
- **Adapt queries to context.** A time-series dataset needs date range analysis. A catalog dataset needs distinct counts.
- **Flag anomalies.** High null rates, unexpected value distributions, date gaps — these are the actionable findings.
- **Be efficient with MCP calls.** Batch what you can. Don't run 20 separate queries when 3 combined ones would work.
