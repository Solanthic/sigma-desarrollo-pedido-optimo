# Data Readiness Report: Pedido Optimo — Foundry Migration

**Date**: 2026-04-06
**Purpose**: Definitive analysis of data availability, derived table lineage, and pending verifications for the Foundry migration. Intended for sharing with POCs (Enrique Morales, Victor Perezo).

---

## Executive Summary

We analyzed 44 static data exports, 39 Snowflake tables, 10 SQL queries, and 5 Python notebooks. The Pedido Optimo pipeline requires 19 source tables. Here is where we stand:


| Category                                                               | Count | Status                                                     |
| ---------------------------------------------------------------------- | ----- | ---------------------------------------------------------- |
| Raw tables available in Snowflake                                      | 5     | Ready to use (T02, T04, T13, T14, T18)                     |
| Raw tables MISSING from Snowflake                                      | 3     | **Need migration** (T01, T10, T19)                         |
| Raw tables PARTIAL in Snowflake (embedded / single-store only)         | 1     | **Need standalone table** (T03 in SOP_PAC_PEDIDO_BASE)     |
| Raw tables with UNCERTAIN Snowflake match                              | 1     | **Need verification** (T12 → SOP_PAC_EMPLOYEES_COMERCIAL?) |
| Derived tables where we HAVE the generation code                       | 6     | Can rebuild in Foundry                                     |
| Derived tables where code is PARTIALLY known                           | 1     | Formula known, aggregation window unknown (T07)            |
| Derived tables where we're MISSING the generation code                 | 4     | **Need documentation from Enrique** (T05, T08, T11, T16)  |
| Pre-computed shortcut tables in Snowflake (derived output, not source) | 3     | Use as validation, not as source                           |
| Sell-in data (TBL_RM_CTX / SHARING_SELLIN)                             | 2     | Incremental sync in progress                               |
| Sell-out daily data (OH + scans)                                       | 1     | Static export only — **Snowflake source unknown**          |


---

## Part 1: Raw Source Tables

### Available in Snowflake — Ready


| Table                      | Pipeline ID | Snowflake Table                                                | Rows        | Verified                             |
| -------------------------- | ----------- | -------------------------------------------------------------- | ----------- | ------------------------------------ |
| Store catalog              | T02         | `SOP_PAC_CAT_TIENDAS` (Pachuca) + `SOP_CAT_TIENDAS` (national) | 104 / 5,912 | Schema validated                     |
| Active store-SKU combos    | T04         | `SOP_PAC_CAT_ACTIVO_TIENDA`                                    | 1,991,395   | Exists, schema not yet validated     |
| Pending credit notes       | T13         | `SOP_PAC_NOTAS_PENDIENTES`                                     | 384         | Schema validated                     |
| Last-day promo headers     | T14         | `SOP_PAC_CABECERAS_ULTIMO_DIA`                                 | 19,797      | Exists, 403 on query                 |
| Customer order projections | T18         | `SOP_PROYECCION_DETALLE_PEDIDOS`                               | 108,058     | Exists (was MySQL, now in Snowflake) |


### MISSING from Snowflake — Need Migration


| Table                          | Pipeline ID | Criticality  | What's Needed                                                                    | Static Export Available?                                                                   |
| ------------------------------ | ----------- | ------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Daily sell-out + inventory** | T01         | **CRITICAL** | Daily OH_kilos + Scan_kilos at store-SKU-day grain. Source = Pavis scanner feed. | Yes: `sell_out_oh_diarios_28` (Fecha, sap, Sku, OH_kilos, Scan_kilos) — 28-day window only |
| **Ordering schedule**          | T10         | **HIGH**     | Day-of-week binary flags per store (Lunes-Domingo)                               | Yes: `Roles_pedido_nacional.csv`                                                           |
| **In-transit shipments**       | T19         | **HIGH**     | Shipment quantities by store-SKU with delivery dates. Source = SAP.              | Not in Foundry                                                                             |


### PARTIAL in Snowflake — Need Standalone Table


| Table                  | Pipeline ID | Criticality  | What's Available                                                                                                                                     | What's Needed                                                                       |
| ---------------------- | ----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **SKU master catalog** | T03         | **CRITICAL** | Embedded in `SOP_PAC_PEDIDO_BASE` (185 rows, 1 store only). Columns: Sku, Producto, Peso, Familia, Linea, Presentacion, Marca visible in that table | Standalone table at national scale. Static export exists: `mermas_autos_cat_sku.csv` |


### UNCERTAIN Snowflake Match — Need Verification


| Table                    | Pipeline ID | Criticality | Possible Snowflake Table            | What's Needed                                                                                                            |
| ------------------------ | ----------- | ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **WhatsApp directory**   | T12         | **HIGH**    | `SOP_PAC_EMPLOYEES_COMERCIAL` (17,517 rows) | Verify this table contains Cel_ejecutivo + Cel_coordinadora columns matching `directorio_whatsapp.csv` schema. If yes, no migration needed |


---

## Part 2: Derived Tables — Code Available (Can Rebuild in Foundry)

These tables are computed by our SQL queries and Python notebooks. We have the **exact logic** and can replicate it as Foundry transforms.


| Derived Output                                | Source Code                    | Inputs Required                                  | Core Logic                                                                                     |
| --------------------------------------------- | ------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Inventario_sugerido** (target inventory)    | `my_query1.sql` CASE statement | T05 (Tipo_merma) + T07 (Scan_pizas)              | `(Scan_pizas / 7) * days_multiplier` where days = 14/12/10/8/7/0 by Tipo_merma                 |
| **OH_Piezas** (on-hand in pieces)             | `my_query1.sql`                | T01 (OH_kilos) + T03 (Peso)                      | `OH_kilos / Peso`, rounded differently for GRANEL vs packaged                                  |
| **OH_proyectado** (projected inventory)       | NB01 Python                    | OH_Piezas + T19 (transit)                        | `OH_Piezas + Piezas_transito`                                                                  |
| **Piezas_empuje** (push quantity)             | NB01 Python                    | Inventario_sugerido + OH_proyectado + Tipo_merma | Push only if Tipo_merma='Ok' AND target > projected. Q-FRESCOS line gets 67% reduction (×0.33) |
| **No_cargar_pedido** (cut flag)               | NB01 Python                    | Tipo_merma + OH_proyectado + Inventario_sugerido | Flag=1 when high-shrinkage AND projected > target                                              |
| **Prioridad** (priority score)                | NB01 Python                    | Piezas_empuje + T08 (Top_venta)                  | 1=push+top seller, 2=push+non-top, 0=no push                                                   |
| **Empuje_cabecera** (promo push)              | NB01 Python                    | T06 (Objetivo_cabecera) + OH_proyectado          | `Objetivo_cabecera - OH_proyectado` if active promotion                                        |
| **Reactivation flags (two flags)**            | `my_query1.sql`                | T05 (Tipo_merma) + T04 (operacion)               | `Reactivar_con_pedido_operacion` if operacion=1; `Reactivar_con_pedido_central` if operacion=0. Triggered when Tipo_merma IS NULL and SKU is active |
| **Con_cabecera_activa / Con_parrilla_activa** | `my_query1.sql`                | T06/T09 vigency dates                            | 1 if today between Inicio_vigencia and Fin_vigencia                                            |
| **Activa_cliente flag**                       | `my_query1.sql`                | T04 (activo_tienda)                              | Flag indicating store-SKU combo is active for the client                                       |
| **Puede_pedir_op flag**                       | `my_query1.sql`                | T04 (activo_tienda) + T10 (roles)                | Flag indicating store-SKU can be ordered operationally                                         |
| **Day-of-week store filtering**               | NB02 Python                    | T10 (roles)                                      | Map weekday → Spanish, filter stores where day=1                                               |
| **Order comparison** (Piezas adicionales)     | NB02 Python                    | Pipeline output + T18 (customer orders)          | `Piezas_a_cargar - Pedido_original_cadena`                                                     |
| **Wal-Mart GRANEL exclusion**                 | NB04 Python                    | T02 (Grupo) + T03 (Presentacion)                 | Exclude where Grupo='Wal-Mart' AND Presentacion='GRANEL'                                       |
| **Alerting flags (impulse/cut)**              | NB03-05 Python                 | Piezas_empuje + No_cargar_pedido                 | `Con_algun_empuje` / `Con_algun_recorte` — triggers alert generation per store                 |
| **Merma ratio (%)**                           | NB03-05 Python                 | T05 (Merma_promedio, Vol_promedio)                | `(-Merma_promedio / Vol_promedio) × 100` — displayed in alert PDFs                             |
| **Soriana routing**                           | NB03-05 Python                 | T02 (Grupo/Cadena)                               | Soriana stores routed to separate alert flow with chain-specific formatting                    |
| **Alert PDF generation (multi-section)**      | NB03-05 Python                 | All derived outputs above                        | Color-coded PDF sections: blue (impulse), red (high-merma), green (promos), coffee (notes)     |
| **Concentrado accumulation (impulse/cut)**    | NB03 Python                    | Alert outputs                                    | `Concentrado_impulso.csv` / `Concentrado_recorte.csv` — historical log with deduplication      |

> **Note on Tipo_merma values**: The source SQL (`my_query1.sql`) contains both `'Scritica'` and `'Critica'` as separate CASE branches with different day multipliers (8 vs 7). Confirm with Enrique whether both are intentional data classifications or if `'Scritica'` is a legacy spelling.

**All formulas documented in**: `context/COMPUTATION_GRAPH.md` Section 2

---

## Part 3: Derived Tables — Code MISSING or PARTIALLY Known (Blindspots)

These tables contain computed results but we do NOT have the complete code/logic that generates them. They are produced by upstream processes outside our codebase.

### CRITICAL — Must document before Enrique's transition (2026-05-04)


| Table                                   | Pipeline ID | Code Status          | What's Computed                                                                                                 | What We Know                                                                                                                                                                        | What We Need                                                                                                                                               |
| --------------------------------------- | ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**mermas_autos_test_pedido_sugerido`** | T05         | **MISSING**          | `Tipo_merma` classification (Ok/Alta/Muy Alta/Scritica/Critica/Inconsistente), `Vol_neto`, `DME`, `Pedido_prom` | Two granularities exist: annual + quarterly (from `mermas_autos_Tipo_merma_anual` schema: Tipo_merma_anual, Tipo_merma_trimestral, last_merma_per). Pipeline likely uses quarterly. | **The exact thresholds/model that maps shrinkage ratios → category labels. Is it rule-based (e.g., merma% < 5% = Ok, 5-10% = Alta)? Statistical? Manual?** |
| `**Venta_scan_semanal_prom`**           | T07         | **PARTIALLY known**  | `Scan_pizas` — weekly average scanned sales in pieces                                                           | Raw daily data exists in `sell_out_oh_diarios_28` (Fecha, sap, Sku, Scan_kilos). "28" suggests 28-day window. Downstream formula `(Scan_pizas/7)*days` is fully documented in `my_query1.sql`. | **Aggregation method unknown: rolling 28 days? Calendar weeks? How is Scan_kilos converted to Scan_pizas (÷ Peso)? Are outliers/promotions excluded?**     |
| `**mermas_autos_TC_Inventario_optimo`** | T16         | **MISSING**          | `Inventario_optimo`, `DOH_Actuales`, `Pedido_minimo_sugerido` — a different optimal inventory model             | In Snowflake as `SOP_PAC_TC_RL` (95 rows, Pachuca + RL class only). Schema: INV_TEORICO, DOH_ACTUALES, INVENTARIO_OPTIMO, PIEZAS_TRANSITO.                                          | **How is Inventario_optimo calculated? Different from NB01's Inventario_sugerido. Which model is "correct" for the Foundry rebuild?**                      |


### HIGH — Should document


| Table                     | Pipeline ID | What's Computed                              | What We Need                                                               |
| ------------------------- | ----------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| `**Sku_insignia`**        | T08         | `Top_venta` binary flag for top-selling SKUs | **Ranking criteria: what metric? Top N per store? Per CEDI? Time window?** |
| `**top_tienda_nacional`** | T11         | `top_tienda` ranking number, `Menor3` flag   | **Same questions as T08 — plus is this a different ranking from T08?**     |


### MEDIUM — Nice to have


| Table                              | What's Computed                      | What We Need                                                                             |
| ---------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `mermas_autos_cabeceras` (T06)     | Promotional objectives               | Is this manually entered by the commercial team or computed?                             |
| `parrrillas` (T09)                 | Promotional grids                    | Same question — manual vs computed?                                                      |
| `actividad_trade` (T15)            | Trade activities                     | Same question                                                                            |
| `mermas_autos_ItemReview_TD` (T17) | Multi-week forecasts, logistics recs | Output of the ~1,400-line Walmart SQL process. Not used in active pipeline but valuable. |


---

## Part 4: Snowflake Availability Matrix

### Pipeline tables in Snowflake


| Pipeline Table             | In Snowflake? | Snowflake Name                        | Rows        | Usable?                                       |
| -------------------------- | ------------- | ------------------------------------- | ----------- | --------------------------------------------- |
| T01 (oh_SCAN)              | **NO**        | —                                     | —           | Static export only (`sell_out_oh_diarios_28`) |
| T02 (cat_tienda)           | **YES**       | SOP_PAC_CAT_TIENDAS + SOP_CAT_TIENDAS | 104 / 5,912 | Yes                                           |
| T03 (cat_sku)              | **Partial**   | Embedded in SOP_PAC_PEDIDO_BASE       | 185         | Only 1 store — need standalone table          |
| T04 (activo_tienda)        | **YES**       | SOP_PAC_CAT_ACTIVO_TIENDA             | 1,991,395   | Yes (schema needs validation)                 |
| T05 (pedido_sugerido)      | **Partial**   | Embedded in SOP_PAC_PEDIDO_BASE       | 185         | Only 1 store — derived, code unknown          |
| T06 (cabeceras)            | **NO**        | —                                     | —           | Static export only                            |
| T07 (venta_scan)           | **Partial**   | Embedded in SOP_PAC_PEDIDO_BASE       | 185         | Only 1 store — derived, code partially known  |
| T08 (sku_insignia)         | **Partial**   | Embedded in SOP_PAC_PEDIDO_BASE       | 185         | Only 1 store — derived, code unknown          |
| T09 (parrrillas)           | **Maybe**     | SOP_PAC_PROMOCIONES?                  | 2,914       | **Needs verification**                        |
| T10 (roles_pedido)         | **NO**        | —                                     | —           | Static export only                            |
| T11 (top_tienda)           | **NO**        | —                                     | —           | Static export only                            |
| T12 (directorio_whatsapp)  | **Maybe**     | SOP_PAC_EMPLOYEES_COMERCIAL?          | 17,517      | **Needs verification**                        |
| T13 (notas_pendientes)     | **YES**       | SOP_PAC_NOTAS_PENDIENTES              | 384         | Yes                                           |
| T14 (cabeceras_ultimo_dia) | **YES**       | SOP_PAC_CABECERAS_ULTIMO_DIA          | 19,797      | Yes                                           |
| T15 (actividad_trade)      | **NO**        | —                                     | —           | Static export only                            |
| T16 (inventario_optimo)    | **Maybe**     | SOP_PAC_TC_RL?                        | 95          | **Needs verification**                        |
| T17 (ItemReview_TD)        | **NO**        | —                                     | —           | Not used in active pipeline                   |
| T18 (proyeccion_pedidos)   | **YES**       | SOP_PROYECCION_DETALLE_PEDIDOS        | 108,058     | Yes                                           |
| T19 (transitos)            | **NO**        | —                                     | —           | Not in any known source                       |


### Large Snowflake tables (sell-in data)


| Snowflake Table  | Rows | Size  | What It Is                                                                                                   | Incremental Strategy                                                                 |
| ---------------- | ---- | ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `SHARING_SELLIN` | 865M | 49 GB | Sell-in billing (Sigma → retailer invoices). Weekly grain (YEAR_WEEK).                                       | Planned: APPEND + incremental on YEAR_WEEK. Blocked by Snowflake connectivity issue. |
| `TBL_RM_CTX`     | 664M | 28 GB | Enriched sell-in billing. Superset of SHARING_SELLIN with REGION, BRAND, PRESENTATION. Same YEAR_WEEK grain. | Same strategy. Sample (100 rows) synced and validated.                               |


**Key finding**: Both are **sell-IN** data (what Sigma shipped), NOT sell-OUT (what retailers sold). The daily sell-out data that feeds the core pipeline (T01/T07) comes from a different source (Pavis scanner feed) that is **not yet in Snowflake**.

---

## Part 5: Additional Datasets Identified in Static Exports

These 26 files in `Sqls_muestras` are NOT in the original pipeline documentation but contain potentially valuable data:

### Confirmed Schema (datasets parsed in Foundry)


| File                            | Schema                                                                                                   | Maps To                  | Relevance                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| `sell_out_oh_diarios_28`        | Fecha (DATE), sap (INT), Sku (INT), OH_kilos (DOUBLE), Scan_kilos (DOUBLE)                               | **Source for T01 + T07** | **CRITICAL** — daily sell-out + inventory at store-SKU-day grain            |
| `mermas_autos_Tipo_merma_anual` | sap (INT), sku (INT), Tipo_merma_anual (STRING), Tipo_merma_trimestral (STRING), last_merma_per (STRING) | Related to T05           | **HIGH** — shows shrinkage classification at annual + quarterly granularity |


### Likely Snowflake Matches (by name)


| File                            | Probable Snowflake Match       | Rows   | Verified?                                                    |
| ------------------------------- | ------------------------------ | ------ | ------------------------------------------------------------ |
| `Inventario_fantasma_AS.csv`    | SOP_PAC_INVENTARIO_FANTASMA_AS | 24,750 | No — 403                                                     |
| `KPI_Sams.csv`                  | SOP_PAC_KPI_SAMS               | 4,278  | No — 403                                                     |
| `KPI_City_Club.csv`             | SOP_PAC_KPI_CITY_CLUB          | 491    | Yes — schema validated (contains TIPO_MERMA, VENTA_PROMEDIO) |
| `Avance_tienda.csv`             | SOP_AVANCE_TIENDA              | 2,894  | No — 403                                                     |
| `Avance_celula.csv`             | SOP_AVANCE_CELULA              | 474    | No — 403                                                     |
| `mermas_autos_lanzamientos.csv` | SOP_VMN_LANZAMIENTOS           | 1,226  | No — 403                                                     |
| `Inventario_fisico.csv`         | SOP_CAPTURA_INV                | 2,497  | No — 403                                                     |
| `mermas_autos_pedido_excel.csv` | SOP_PAC_MODIFICADO             | 28,795 | No — 403                                                     |


### Intermediate/Analytics Tables (no Snowflake match)


| File                                      | Likely Purpose                             | Pipeline Relevance                   |
| ----------------------------------------- | ------------------------------------------ | ------------------------------------ |
| `sell_in_sell_out28.csv`                  | Combined sell-in + sell-out over 28 days   | Could be used for shrinkage analysis |
| `sell_in_as_diario.csv`                   | Daily sell-in for autoservices             | Complements T19 (transitos)          |
| `mermas_autos_scan_sem.csv`               | Weekly scanned sales (intermediate to T07) | Shows T07 aggregation step           |
| `mermas_autos_fact_sem.csv`               | Weekly factual metrics                     | Intermediate computation             |
| `mermas_mes_calculo.csv`                  | Monthly shrinkage calculation              | Intermediate for T05                 |
| `mermas_autos.csv`                        | Master shrinkage summary                   | Base table for T05                   |
| `recurrencia.csv`                         | Order frequency patterns                   | Demand seasonality                   |
| `mermas_autos_cat_tienda_celula.csv`      | Store catalog with cell grouping           | Extended dimension                   |
| `mermas_autos_cat_sku_soriana.csv`        | Soriana-specific SKU catalog               | Chain-specific dimension             |
| `mermas_autos_TC_Cat_sku.csv`             | TC-class SKU catalog                       | Subset dimension                     |
| `Sku_bottom.csv`                          | Bottom-selling SKU flags                   | Inverse of T08                       |
| `Resultado_AA_AA_tienda.csv`              | Analysis results per store                 | Reporting artifact                   |
| `mermas_autos_avance_anterior/actual.csv` | Progress metrics (prev/current period)     | Operational tracking                 |


---

## Part 6: Pending Verifications for POCs

### For Enrique Morales (before 2026-05-04 transition)


| #   | Question                                                                                                                                                                                                                                            | Priority | Context                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **How is `Tipo_merma` classified?** What are the exact thresholds or model that maps shrinkage metrics → Ok/Alta/Muy Alta/Scritica/Critica/Inconsistente? Is it rule-based or statistical?                                                          | **P0**   | This is the single most important variable in the pipeline. It determines the days-of-supply multiplier (14/12/10/8/7/0) for every store-SKU. We found annual + quarterly classifications exist (`mermas_autos_Tipo_merma_anual`). |
| 2   | **How is `Scan_pizas` (weekly sales velocity) computed?** Is it rolling 28 days averaged to weekly? Simple SUM(Scan_kilos)/Peso over 4 weeks? Are outliers/promotions excluded?                                                                     | **P0**   | We found the raw daily data (Scan_kilos in `sell_out_oh_diarios_28`). We need the exact aggregation to replicate in Foundry.                                                                                                       |
| 3   | **What is the relationship between `Inventario_sugerido` (NB01) and `Inventario_optimo` (TC_RL table)?** Are they two versions of the same model? Which should we use for the Foundry rebuild?                                                      | **P1**   | NB01 uses `(Scan_pizas/7)*days_by_merma`. TC_RL has its own `INVENTARIO_OPTIMO`. Both produce order suggestions but may give different answers.                                                                                    |
| 4   | **What generates `Sku_insignia` and `top_tienda_nacional`?** What's the ranking methodology (metric, scope, time window)?                                                                                                                           | **P1**   | These drive priority scoring (which store-SKUs get pushed first).                                                                                                                                                                  |
| 5   | **Where does the daily sell-out data originate?** We found `sell_out_oh_diarios_28` (Fecha, sap, Sku, OH_kilos, Scan_kilos) as a static export. Is this from the Pavis scanner feed? Is it in SQL Server? What's the path to get it into Snowflake? | **P0**   | This is the foundational raw dataset — it feeds T01 (inventory) and T07 (sales velocity). Without it in Snowflake, the Foundry pipeline can't run.                                                                                 |
| 6   | **Are `mermas_autos_cabeceras` (T06), `parrrillas` (T09), and `actividad_trade` (T15) manually entered or computed?**                                                                                                                               | **P2**   | If manually entered, they're raw data and should be migrated as-is. If computed, we need the logic.                                                                                                                                |


### For Victor Perezo (data engineering)


| #   | Question                                                                                                                                                                                                                       | Priority | Context                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------- |
| 1   | **Can you add `sell_out_oh_diarios_28` source data to Snowflake?** Schema: Fecha (DATE), sap (INT), Sku (INT), OH_kilos (DOUBLE), Scan_kilos (DOUBLE). Currently only in SQL Server. This is the #1 migration blocker.         | **P0**   | Source is likely the Pavis scanner feed that lands in SQL Server. Need daily refresh in Snowflake. |
| 2   | **Fix Snowflake connectivity for large table syncs.** SHARING_SELLIN (865M) and TBL_RM_CTX (664M) both fail on full sync. We have an incremental strategy ready (YEAR_WEEK bounded subquery, one week per run).                | **P0**   | Incremental sync config is documented and ready to deploy once connectivity works.                 |
| 3   | **Confirm: does `SOP_PAC_PROMOCIONES` = `parrrillas`?** Compare schemas.                                                                                                                                                       | **P2**   | Affects T09 mapping.                                                                               |
| 4   | **Confirm: does `SOP_PAC_EMPLOYEES_COMERCIAL` contain phone numbers?** Compare with `directorio_whatsapp` schema (sap, Cel_ejecutivo, Cel_coordinadora).                                                                       | **P2**   | Affects T12 mapping — needed for WhatsApp alert distribution.                                      |
| 5   | **Can you migrate these 5 tables to Snowflake?** `mermas_autos_cat_sku` (T03), `Roles_pedido_nacional` (T10), `directorio_whatsapp` (T12), `mermas_autos_cabeceras` (T06), `actividad_trade` (T15). All are small (<10K rows). | **P1**   | These are raw tables currently only in SQL Server. Small and straightforward to migrate.           |
| 6   | **Build the INFORMATION_SCHEMA.COLUMNS dataset.** The sync exists but was never run (0 files). Would give us column-level metadata for all 39 Snowflake tables at once.                                                        | **P2**   | Would allow us to verify all schemas without querying each table individually.                     |


---

## Part 7: What We CAN Build Today

Even with the gaps, we can start building Foundry transforms for the logic we DO have:


| Transform                         | Inputs (available)                               | What it does                                                | Blocked by                                 |
| --------------------------------- | ------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------ |
| `source_standardization` (T1)     | SOP_PAC_CAT_TIENDAS, SOP_CAT_TIENDAS             | Normalize store keys, enrich with hierarchy                 | Nothing — ready                            |
| `inventory_baseline_compute` (T2) | `sell_out_oh_diarios_28` (static export)         | Filter to latest Fecha, compute OH_Piezas = OH_kilos / Peso | T03 (cat_sku) in Snowflake for Peso lookup |
| `target_inventory_compute` (T3)   | T05 + T07 (partial in SOP_PAC_PEDIDO_BASE)       | Apply `(Scan_pizas/7) * days_by_merma` CASE logic           | Full T05/T07 at national scale             |
| `order_comparison` (T5)           | Pipeline output + SOP_PROYECCION_DETALLE_PEDIDOS | Compare suggested vs actual orders, classify delta          | Pipeline output from T2-T4                 |
| `notes_enrichment`                | SOP_PAC_NOTAS_PENDIENTES                         | Enrich with store metadata for PDF display                  | Nothing — ready                            |


---

## Appendix: Reference Documents


| Document                  | Path                                              | Contents                                                  |
| ------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| Table Inventory           | `context/TABLE_INVENTORY.md`                      | Per-table detail with Foundry status, schemas, join keys  |
| Computation Graph         | `context/COMPUTATION_GRAPH.md`                    | Raw vs derived classification, exact formulas, blindspots |
| Dataset Mapping           | `context/DATASET_MAPPING.md`                      | All 44 static exports mapped to Snowflake and pipeline    |
| Discovery                 | `context/DISCOVERY.md`                            | Full pipeline architecture and execution flow             |
| Business/Technical Canons | `context/commercial-strategy/use-case/` (symlink) | Business process, data contracts, ontology scope          |


