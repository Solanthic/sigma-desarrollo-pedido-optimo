# Dataset Source Rules

## Summary
Rules for which Foundry raw datasets are valid sources for Pedido Optimo ontology objects. Not all datasets in the raw folder are usable — they come from different systems with different purposes.

## Context
Discovered during ontology backing dataset mapping (2026-04-09). The raw folder contains 66 datasets across two schemas with very different roles.

## Details

### IND_* datasets (USE THESE)
- Schema: `"DB_GOLD"."SC_PALANTIR_SD"."IND_*"`
- These are the correct data sources for Pedido Optimo
- Sigma is actively populating them from Snowflake
- Many are currently empty (0 rows) but have correct schemas
- Use the schemas to design transforms even before data arrives

### SOP_* datasets (DO NOT USE)
- Schema: `"DB_GOLD"."SC_PALANTIR_SD"."SOP_*"`
- These come from a **different system** — not useful for Pedido Optimo
- May have similar-looking data but are not the authoritative source
- Ignore them entirely when mapping ontology objects

### SC_MX_SD datasets (USE — large sales tables)
- Schema: `"DB_GOLD"."SC_MX_SD".*`
- `TBL_RM_CTX` and `SHARING_SELLIN` — SAP billing/sell-in data
- `TBL_MXN_RTM_SKU` — SKU/RTM transactional data
- Various `IND_*` datasets (sell-out, sell-in daily, etc.)
- These are valid sources, currently being backfilled with weekly incremental syncs

### Pipeline outputs (BUILD IN FOUNDRY)
- `IND_AJUSTES_PEDIDO` (43 cols) — the legacy pipeline output
- We do NOT import this — we rebuild the computation in Foundry from scratch
- Use its schema as a **reference** for what our transforms should produce
- Same applies to other pre-computed datasets like `IND_MERMAS_AUTOS_TC_INVENTARIO_OPTIMO`

## Source
- [Task](../tasks/2026-04-09-ontology-backing-dataset-mapping/TASK.md)
