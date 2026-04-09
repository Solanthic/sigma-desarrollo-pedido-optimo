# Weekly Incremental Sync Pattern for Large Snowflake Tables

## Summary
Standard pattern for syncing large Snowflake tables (100M+ rows) into Foundry incrementally using `YEAR_WEEK` as the cursor column. Fetches exactly 1 week per run with no duplicates, handles year-boundary edge cases.

## Context
Discovered while fixing SHARING_SELLIN duplication (1.71B rows, ~400M duplicates). Root cause: using `>=` instead of `>` with a 2-month window and 30-minute schedule. The `>=` re-fetched the cursor week on every run.

## Details

### Query Template
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

### Key Design Rules

1. **Always use strict `>` (not `>=`)** for the lower bound. The `?` placeholder holds the MAX value from the last sync. Using `>=` re-fetches the cursor week every run.

2. **Bound the upper window to 1 week.** Without an upper bound, a single run could pull months of data during backfill. The `IFF` handles the year boundary: week 52+ rolls to year+1 week 1.

3. **YEAR_WEEK format is YYYYWW** (6-digit LONG, e.g., 202415). It's monotonically increasing within a year but jumps at year boundaries (202552 → 202601).

4. **Set initial value to 1 week BEFORE earliest data.** E.g., if data starts at 202401, set initial to 202352.

5. **Use the same query for all similar syncs.** Only the table name changes. Consistency prevents bugs.

6. **Add `sync_timestamp`** via `CURRENT_TIMESTAMP AS sync_timestamp` to track ingestion time.

### Backfill Strategy

- **Phase 1 (fast backfill)**: Schedule every 30 minutes. Each run fetches 1 week. ~48 weeks/day. Full backfill of 150 weeks takes ~3 days.
- **Phase 2 (steady state)**: Switch to daily schedule once caught up. Each run fetches the latest week if new data exists.

### Incremental Settings
| Setting | Value |
|---------|-------|
| Column | `YEAR_WEEK` |
| Type | `LONG` |
| Transaction type | `Append` |
| Compute profile | Medium (6 GB) |

### Validation Queries
```sql
-- Check for duplicates (should return 0 rows)
SELECT YEAR_WEEK, BILL_NUM, BILL_ITEM, COUNT(*) as cnt
FROM `{dataset_rid}`
GROUP BY YEAR_WEEK, BILL_NUM, BILL_ITEM
HAVING cnt > 1
LIMIT 10

-- Compare new vs old dataset for same weeks
SELECT YEAR_WEEK, COUNT(*) as rows
FROM `{dataset_rid}`
GROUP BY YEAR_WEEK
ORDER BY YEAR_WEEK DESC
LIMIT 20
```

### Pitfalls to Avoid
- `>=` in the WHERE clause → re-fetches cursor week every run
- Multi-month windows → overlapping data when cursor advances
- Aggressive schedule (30 min) with Append on steady-state → wasteful empty runs (use daily)
- No upper bound during backfill → single run pulls entire table

## Source
- [Task](../tasks/2026-04-09-incremental-sync-large-datasets/TASK.md)
