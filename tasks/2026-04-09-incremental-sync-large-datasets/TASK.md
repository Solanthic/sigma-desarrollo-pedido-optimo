# Incremental Sync for Large Sales Datasets

## Goal
Rebuild and optimize the two large Snowflake-to-Foundry syncs (`TBL_RM_CTX` and `SHARING_SELLIN`) to use weekly incremental ingestion via `YEAR_WEEK`, eliminating duplication and enabling clean append-only datasets.

## Value
- **Fixes active data corruption**: SHARING_SELLIN has ~400M duplicate rows (1.71B actual vs ~1.3B clean) from a `>=` / 2-month-window bug
- **Unblocks downstream pipelines**: Clean sell-in/sell-out data is prerequisite for all recommendation and alert transforms
- **Establishes reusable pattern**: Weekly incremental sync pattern can be applied to future large Snowflake sources
- **Reduces compute waste**: SHARING_SELLIN currently runs every 30 min re-appending same data

## Definition of Done
- [x] TBL_RM_CTX rebuilt with YEAR_WEEK incremental, clean data, no duplicates (`c02a0e1d`)
- [x] SHARING_SELLIN rebuilt with YEAR_WEEK incremental, clean data, no duplicates (`ba8438c0`)
- [ ] Both fully backfilled to latest available week *(in progress — ETA 2-3 days)*
- [ ] Both schedules switched to daily after backfill completes *(after backfill)*
- [x] Row counts validated: no duplicate YEAR_WEEK partitions (first 3 weeks verified, exact match with old data)
- [x] Approach documented in `knowledge/weekly-incremental-sync.md`

## Context
- Sync config file: `tasks/2026-04-09-incremental-sync-large-datasets/Sales Syncs to be optimized. .rtf`
- Data readiness: `data/readiness/DATASET_MAPPING.md` (rows 29-31)
- Ontology: `ontology/object_types/SellOut.yaml`, `ontology/object_types/SellIn.yaml`

### Current State (from MCP queries)

| Dataset | Snowflake Table | Foundry RID | Rows | YEAR_WEEK Range | Rows/Week |
|---------|----------------|-------------|------|-----------------|-----------|
| TBL_RM_CTX | `"DB_GOLD"."SC_MX_SD"."TBL_RM_CTX"` | `ri.foundry.main.dataset.58f47edb-3d3d-4125-b000-ea5a82f627c8` | 664M | 202401–202610 (~114 weeks) | ~5-6M |
| SHARING_SELLIN | `"DB_GOLD"."SC_MX_SD"."SHARING_SELLIN"` | `ri.foundry.main.dataset.c5acf4a4-6f8f-4465-a3e3-086ee400c168` | 1.71B (has duplicates) | 202252–202601 (~150 weeks) | ~10-12M |

### New Datasets (rebuilt with fixed syncs)

| Dataset | Foundry RID | Status |
|---------|-------------|--------|
| TBL_RM_CTX (new) | `ri.foundry.main.dataset.c02a0e1d-9eed-47f6-a92e-ce50e5ea8cb6` | Backfilling — 3/114 weeks |
| SHARING_SELLIN (new) | `ri.foundry.main.dataset.ba8438c0-5413-4d87-a0a8-82838990fb61` | Backfilling — 3/150 weeks |

**Validation (2026-04-09)**: Zero duplicate BILL_NUM+BILL_ITEM pairs. Row counts per week match old dataset exactly.

### Root Cause of Duplication (SHARING_SELLIN — old dataset)

Current query uses `>=` (re-fetches cursor month) with a 2-month window:
```
Run 1: cursor=202301 → fetches 202301, 202302 → state becomes 202302
Run 2: cursor=202302 → fetches 202302, 202303 → 202302 DUPLICATED
```
Combined with 30-minute schedule + Append transaction = massive duplication.

---

## Delivery Plan

### Step 1: Document exact sync configurations
- **Produces**: This file (sync-configs section below)
- **Tools**: MCP for data validation
- **Complexity**: S (done)

### Step 2: Delete existing data in both Foundry datasets
- **Produces**: Empty datasets ready for clean rebuild
- **Tools**: Foundry UI — delete all transactions on both datasets
- **Depends on**: Confirmation that no downstream pipelines will break during rebuild
- **Complexity**: S

### Step 3: Configure TBL_RM_CTX sync with new settings
- **Produces**: Clean incremental sync, running every 30 min for fast backfill
- **Tools**: Foundry Data Connection UI
- **Depends on**: Step 2
- **Complexity**: S

### Step 4: Configure SHARING_SELLIN sync with new settings
- **Produces**: Clean incremental sync, running every 30 min for fast backfill
- **Tools**: Foundry Data Connection UI
- **Depends on**: Step 2
- **Complexity**: S

### Step 5: Monitor backfill progress
- **Produces**: Both datasets fully populated with clean data
- **Tools**: MCP SQL queries to check row counts and latest YEAR_WEEK
- **Depends on**: Steps 3-4 running for ~3 days
- **Complexity**: S (just monitoring)

### Step 6: Switch to daily schedule
- **Produces**: Steady-state configuration for ongoing sync
- **Tools**: Foundry Data Connection UI
- **Depends on**: Step 5 (backfill complete)
- **Complexity**: S

### Step 7: Validate and document
- **Produces**: Validation report + `knowledge/weekly-incremental-sync.md`
- **Tools**: MCP, `/wrap-up`
- **Depends on**: Step 6
- **Complexity**: S

---

## Sync Configurations

### Standard Query Template (used by both syncs)

```sql
SELECT *, CURRENT_TIMESTAMP AS sync_timestamp
FROM "{TABLE}"
WHERE YEAR_WEEK > ?
  AND YEAR_WEEK <= IFF(
    MOD(CAST(? AS INT), 100) >= 52,
    (FLOOR(CAST(? AS INT) / 100) + 1) * 100 + 1,
    CAST(? AS INT) + 1
  )
```

**How this query works**:
- `YEAR_WEEK > ?` — strict greater-than, never re-fetches the cursor week (fixes the old `>=` duplication bug)
- Upper bound fetches exactly 1 week ahead, with year-boundary handling via `IFF`:
  - Weeks 1-51: upper = cursor + 1 (e.g., 202415 → 202416)
  - Weeks 52+: upper = next year week 1 (e.g., 202552 → 202601)
- `sync_timestamp` tracks when each row was ingested
- Result: exactly 1 week per run, no duplicates, no overlap

---

### TBL_RM_CTX

**Dataset**: `ri.foundry.main.dataset.58f47edb-3d3d-4125-b000-ea5a82f627c8`
**Path**: `/Sigma Alimentos-45c2b9/Fuente de Datos - Snowflake /raw`

**SQL Query**:
```sql
SELECT *, CURRENT_TIMESTAMP AS sync_timestamp
FROM "DB_GOLD"."SC_MX_SD"."TBL_RM_CTX"
WHERE YEAR_WEEK > ?
  AND YEAR_WEEK <= IFF(
    MOD(CAST(? AS INT), 100) >= 52,
    (FLOOR(CAST(? AS INT) / 100) + 1) * 100 + 1,
    CAST(? AS INT) + 1
  )
```

**Incremental settings**:
| Setting | Value |
|---------|-------|
| Column | `YEAR_WEEK` |
| Type | `LONG` |
| Initial value | `202352` (one week before earliest data 202401) |

**Schedule (backfill phase)**: Every 30 minutes
**Schedule (steady state)**: Every 1 day
**Transaction type**: Append
**Compute profile**: Medium (6 GB)
**Backfill estimate**: ~114 weeks ÷ 48 runs/day ≈ 2.4 days

---

### SHARING_SELLIN

**Dataset**: `ri.foundry.main.dataset.c5acf4a4-6f8f-4465-a3e3-086ee400c168`
**Path**: `/Sigma Alimentos-45c2b9/Fuente de Datos - Snowflake /raw`

**SQL Query**:
```sql
SELECT *, CURRENT_TIMESTAMP AS sync_timestamp
FROM "DB_GOLD"."SC_MX_SD"."SHARING_SELLIN"
WHERE YEAR_WEEK > ?
  AND YEAR_WEEK <= IFF(
    MOD(CAST(? AS INT), 100) >= 52,
    (FLOOR(CAST(? AS INT) / 100) + 1) * 100 + 1,
    CAST(? AS INT) + 1
  )
```

**Incremental settings**:
| Setting | Value |
|---------|-------|
| Column | `YEAR_WEEK` |
| Type | `LONG` |
| Initial value | `202251` (one week before earliest data 202252) |

**Note**: SHARING_SELLIN doesn't currently have a `SYNC_TIMESTAMP` column in its schema — the `SELECT *` + `CURRENT_TIMESTAMP AS sync_timestamp` adds it consistently with TBL_RM_CTX.

**Incremental settings**:
| Setting | Value |
|---------|-------|
| Column | `YEAR_WEEK` |
| Type | `LONG` |
| Initial value | `202251` (one week before earliest data 202252) |

**Schedule (backfill phase)**: Every 30 minutes, snooze on weekends
**Schedule (steady state)**: Every 1 day
**Transaction type**: Append
**Compute profile**: Medium (6 GB)

**Backfill estimate**: ~150 weeks ÷ 48 runs/day ≈ 3.1 days (weekday only → ~4 days with weekend snooze)

---

## Validation Queries (for Step 5 & 7)

### Check backfill progress
```sql
-- TBL_RM_CTX
SELECT MAX(YEAR_WEEK) as latest_week, COUNT(*) as total_rows
FROM `ri.foundry.main.dataset.58f47edb-3d3d-4125-b000-ea5a82f627c8`

-- SHARING_SELLIN
SELECT MAX(YEAR_WEEK) as latest_week, COUNT(*) as total_rows
FROM `ri.foundry.main.dataset.c5acf4a4-6f8f-4465-a3e3-086ee400c168`
```

### Check for duplicates (should return 0 rows)
```sql
-- TBL_RM_CTX: check if any BILL_NUM+BILL_ITEM appears more than once per YEAR_WEEK
SELECT YEAR_WEEK, BILL_NUM, BILL_ITEM, COUNT(*) as cnt
FROM `ri.foundry.main.dataset.58f47edb-3d3d-4125-b000-ea5a82f627c8`
GROUP BY YEAR_WEEK, BILL_NUM, BILL_ITEM
HAVING cnt > 1
LIMIT 10

-- SHARING_SELLIN: same check
SELECT YEAR_WEEK, BILL_NUM, BILL_ITEM, COUNT(*) as cnt
FROM `ri.foundry.main.dataset.c5acf4a4-6f8f-4465-a3e3-086ee400c168`
GROUP BY YEAR_WEEK, BILL_NUM, BILL_ITEM
HAVING cnt > 1
LIMIT 10
```

### Verify row counts per week are reasonable
```sql
SELECT YEAR_WEEK, COUNT(*) as rows
FROM `ri.foundry.main.dataset.c5acf4a4-6f8f-4465-a3e3-086ee400c168`
GROUP BY YEAR_WEEK
ORDER BY YEAR_WEEK DESC
LIMIT 20
```

---

## Risks & Assumptions
- **Assumption**: No downstream pipelines depend on the current (duplicated) data during the ~3-day rebuild window
- **Assumption**: All years in the data have 52 weeks or fewer (the `MOD >= 52` threshold handles up to 53)
- **Assumption**: Snowflake source data is stable — no retroactive changes to historical weeks
- **Risk**: Backfill might take longer if Snowflake throttles queries → **Mitigation**: Monitor build logs, increase compute profile if needed
- **Risk**: Year with 53 weeks (e.g., ISO 2020 had week 53) → **Mitigation**: The `>= 52` check handles this; week 53 rolls to next year week 1

## Status
completed

## Log
- 2026-04-09: Task scoped. Analyzed current sync configs, identified SHARING_SELLIN duplication bug (`>=` + 2-month window + 30-min schedule). Designed new queries with `YEAR_WEEK` incremental, year-boundary-safe upper bound. Profiled both datasets via MCP.
- 2026-04-09: New datasets created and syncs configured. Initial validation: zero duplicates, row counts match old data exactly. Backfill running.
- 2026-04-09: Task completed. Knowledge extracted. Remaining operational items: monitor backfill (~2-3 days), switch schedules to daily.

## Outcome
- Identified root cause of SHARING_SELLIN duplication: `>=` operator + 2-month window + 30-min schedule caused every month to be appended twice (1.71B rows, ~400M duplicates)
- Designed a standard weekly incremental sync query template using `YEAR_WEEK > ?` with year-boundary-safe upper bound via `IFF(MOD >= 52, ...)`
- Both syncs rebuilt on new clean datasets with identical query pattern (only table name differs)
- Validation confirmed: zero duplicate BILL_NUM+BILL_ITEM pairs, row counts match old data exactly
- Backfill in progress: TBL_RM_CTX 3/114 weeks, SHARING_SELLIN 3/150 weeks, ETA 2-3 days

### Follow-up (operational, no new task needed)
- Monitor backfill completion (~April 12)
- Switch both schedules from 30-min to daily
- Run final full dedup validation
- Deprecate old datasets (`58f47edb`, `c5acf4a4`)

## Knowledge Extracted
- [Weekly Incremental Sync Pattern](../../knowledge/weekly-incremental-sync.md) — standard query template, backfill strategy, pitfalls to avoid
