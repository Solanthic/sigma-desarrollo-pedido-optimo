# Table Inventory: Pedido Optimo Pipeline

This document catalogs every table used across the 10 SQL queries and 5 notebooks in the current Pedido Optimo pipeline. It serves as the reference for mapping current-state data dependencies to Foundry datasets.

---

## Summary

| Category | Count | Notes |
|---|---|---|
| Source tables (SQL Server) | 17 | Main database on `SIACECLU04\SIACESQLQAS` |
| Source tables (separate DB) | 1 | `indicadoresdb` — different SQL Server database |
| Source tables (MySQL) | 1 | HostGator `162.241.61.143` — PHP web app backend |
| **Total source tables** | **19** | |
| File-based inputs | 3 | transitos.csv, Ajustes_pedido.xlsx, Resumen_carga.xlsx |

---

## Table-by-Table Inventory

### T01 — `mermas_autos_cabeceras_oh_SCAN`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server (`SIACECLU04\SIACESQLQAS`) |
| **Used in** | `my_query1.sql` (base table + subquery for MAX date) |
| **Grain** | Store-SKU-Day |
| **Role** | Daily inventory snapshots — the starting point for the entire pipeline |
| **Key columns** | `Sap` (store), `Sku` (product), `Fecha` (snapshot date), `OH_kilos` (on-hand in kilos) |
| **How it's used** | Filtered to day-before-latest date + Pachuca CEDI. Provides current inventory position per store-SKU |
| **Join keys** | `Sap`, `Sku` |
| **Volume estimate** | High — one row per store-SKU per day |
| **Criticality** | **CRITICAL** — pipeline cannot run without this |
| **Foundry status** | **MISSING from Snowflake as standalone table** — BUT the underlying daily data exists in `sell_out_oh_diarios_28` (dataset `ri.foundry.main.dataset.6318e2dc-b729-4e55-a037-8209e29b3441`, schema: Fecha/DATE, sap/INT, Sku/INT, OH_kilos/DOUBLE, Scan_kilos/DOUBLE). This 28-day rolling dataset contains OH_kilos at store-SKU-day grain — identical to T01. Likely sourced from `TBL_RM_CTX` (664M rows) in Snowflake. |
| **Notes** | Also used in subquery `SELECT MAX(Fecha)` to determine the reference date. **No longer the #1 blocker if we can source from sell_out_oh_diarios_28 or TBL_RM_CTX.** A Foundry transform can filter to latest date to replicate T01's behavior. |

---

### T02 — `mermas_autos_cat_tienda`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query1.sql`, `my_query3.sql`, `my_query4.sql`, `my_query5.sql`, `my_query6.sql` |
| **Grain** | Store (one row per Sap) |
| **Role** | Store master catalog — dimension table used everywhere for CEDI filtering and store metadata |
| **Key columns** | `Sap` (PK), `Tienda` (name), `Grupo` (group), `Cadena` (chain: Walmart/Soriana/etc.), `Cedi` (distribution center), `Region`, `Zona` |
| **How it's used** | Joined in 5 queries to filter by `Cedi = 'Pachuca'` and enrich with store attributes |
| **Join keys** | `Sap` |
| **Volume estimate** | Low — one row per store |
| **Criticality** | **CRITICAL** — used in 5 of 10 queries; CEDI filter depends on this |
| **Foundry status** | **[x] In Snowflake  [x] In Foundry** — `SOP_PAC_CAT_TIENDAS` (104 rows, Pachuca subset, `ri.foundry.main.dataset.384369ef-50d4-4e4c-b8f6-b59ff72b04cd`) + `SOP_CAT_TIENDAS` (5,912 rows, national, `ri.foundry.main.dataset.143ada88-a4d2-4133-a0c7-24693626b506`) |
| **Notes** | `Cadena` drives retailer-specific routing in NB04 (Soriana vs Walmart vs others). `Grupo` used for Wal-Mart GRANEL exclusion. Snowflake schema adds: NOMINA_EJECUTIVO, EJECUTIVO, RUTA, TAMANIO, FORMATO, CLAVE |

---

### T03 — `mermas_autos_cat_sku`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query1.sql` |
| **Grain** | Product (one row per Sku) |
| **Role** | SKU master catalog — provides product attributes and weight for unit conversion |
| **Key columns** | `Sku` (PK), `Producto` (name), `Familia`, `Linea`, `Presentacion`, `Marca`, `Peso` (weight in kg) |
| **How it's used** | Joined to convert OH_kilos to OH_Piezas (`OH_kilos / Peso`). `Linea` used for Q-FRESCOS rule. `Presentacion` used for GRANEL detection |
| **Join keys** | `Sku` |
| **Volume estimate** | Low-Medium — one row per product |
| **Criticality** | **CRITICAL** — `Peso` is needed for kilos-to-pieces conversion throughout the pipeline |
| **Foundry status** | **PARTIAL** — No standalone SKU catalog in Snowflake. SKU columns (Producto, Familia, Linea, Presentacion, Marca, Peso) are embedded in `SOP_PAC_PEDIDO_BASE` but only 185 rows (1 store). |
| **Notes** | `Peso = 0` or NULL would cause division errors. `Linea = 'Q-FRESCOS'` triggers 33% push reduction in NB01. CSV sample in Sqls_muestras: `mermas_autos_cat_sku.csv` + `mermas_autos_TC_Cat_sku.csv` |

---

### T04 — `mermas_autos_cat_activo_tienda`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query1.sql` |
| **Grain** | Store-SKU |
| **Role** | Active store-SKU combinations with operational permission flags |
| **Key columns** | `sap`, `sku`, `operacion` (permission flag: 1=can order via operations, 0=needs central) |
| **How it's used** | LEFT JOIN — presence means `Activa_cliente = 1`. `operacion` value determines `Puede_pedir_op` and reactivation flags |
| **Join keys** | `sap`, `sku` |
| **Volume estimate** | High — one row per active store-SKU combo |
| **Criticality** | **HIGH** — controls whether a store-SKU appears in alerts and which ordering path applies |
| **Foundry status** | **[x] In Snowflake  [x] In Foundry** — `SOP_PAC_CAT_ACTIVO_TIENDA` (1,991,395 rows, `ri.foundry.main.dataset.203a4952-1820-45d1-8e9a-e19c97b920ff`). Schema not yet validated (dataset exists but no schema on master branch). |
| **Notes** | Absence from this table (NULL after LEFT JOIN) triggers reactivation flags. `operacion` distinguishes operational vs central reactivation. Also: `SOP_PAC_CAT_ACTIVO_TIENDA_INVENTARIO_MODIF` exists but is empty (0 rows). |

---

### T05 — `mermas_autos_test_pedido_sugerido`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query1.sql` |
| **Grain** | Store-SKU |
| **Role** | Suggested order metrics — the shrinkage classification that drives target inventory levels |
| **Key columns** | `Sap`, `Sku`, `Vol_neto` (net volume), `DME` (daily avg shrinkage), `Tipo_merma` (shrinkage class), `Tipo_de_precio`, `Pedido_prom` (avg order) |
| **How it's used** | `Tipo_merma` is the most important field — drives the `Inventario_sugerido` CASE logic (Ok=14d, Alta=12d, etc.). `Vol_neto` and `DME` are passed through for reference |
| **Join keys** | `Sap`, `Sku` |
| **Volume estimate** | High — one row per store-SKU |
| **Criticality** | **CRITICAL** — `Tipo_merma` is the primary input for target inventory calculation. Without it, no suggestion is generated |
| **Foundry status** | **PARTIAL** — No standalone table in Snowflake. TIPO_MERMA, VOL_PROMEDIO, MERMA_PROMEDIO columns embedded in `SOP_PAC_PEDIDO_BASE` (185 rows, 1 store only). |
| **Notes** | Known values for `Tipo_merma`: Ok, Alta, Muy Alta, Scritica (likely Subcritica), Critica, Inconsistente. NULL means "no classification" and triggers reactivation logic. CSV sample: `mermas_autos_test_pedido_sugerido.csv` |

---

### T06 — `mermas_autos_cabeceras`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query1.sql` |
| **Grain** | Store-SKU (promotional header) |
| **Role** | Promotional header objectives — drives `Empuje_cabecera` (header-based push recommendations) |
| **Key columns** | `Sap`, `sku`, `Inicio_vigencia`, `Fin_vigencia`, `Objetivo_OH` (target on-hand for promotion) |
| **How it's used** | LEFT JOIN — if today is between vigency dates, `Con_cabecera_activa = 1` and `Empuje_cabecera` is computed as `Objetivo_OH - OH_proyectado` |
| **Join keys** | `Sap`, `sku` |
| **Volume estimate** | Medium — only store-SKUs with active/recent promotions |
| **Criticality** | **MEDIUM** — enhances recommendations but pipeline works without it |
| **Foundry status** | **MISSING** — Not in Snowflake as standalone table. `SOP_PAC_CABECERAS_ULTIMO_DIA` exists but is a different view (last-day only). |
| **Notes** | Part of the "Cabeceras" table family flagged in meeting notes as needing manual/staged migration handling. CSV sample: `mermas_autos_cabeceras.csv` |

---

### T07 — `Venta_scan_semanal_prom`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query1.sql` |
| **Grain** | Store-SKU |
| **Role** | Weekly average scanned sales — the denominator for inventory target calculation |
| **Key columns** | `sap`, `sku`, `Scan_pizas` (weekly avg scanned sales in pieces) |
| **How it's used** | `Scan_pizas` is the core input for `Inventario_sugerido = (Scan_pizas / 7) * multiplier`. Also exposed as `Scan_prom` in downstream outputs |
| **Join keys** | `sap`, `sku` |
| **Volume estimate** | High — one row per store-SKU with sales history |
| **Criticality** | **CRITICAL** — without sales data, `Inventario_sugerido` is NULL and no recommendation is generated |
| **Foundry status** | **PARTIAL in Snowflake** (embedded in SOP_PAC_PEDIDO_BASE, 185 rows) — BUT the raw daily scan data exists in `sell_out_oh_diarios_28` (dataset `ri.foundry.main.dataset.6318e2dc-b729-4e55-a037-8209e29b3441`) as `Scan_kilos` at store-SKU-day grain. Weekly `Scan_pizas` = `SUM(Scan_kilos over 7 days) / Peso`. Can be recomputed in Foundry from this source. |
| **Notes** | Source is Pavis scanner-sales feed. NULL Scan_pizas propagates as NULL throughout (no COALESCE). **Blindspot 2 partially resolved**: aggregation is SUM of daily Scan_kilos / Peso. Remaining question: exact time window (7 days? rolling? calendar week?). |

---

### T08 — `Sku_insignia`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query1.sql` |
| **Grain** | Store-SKU |
| **Role** | Flagship/top-selling SKU flags — drives priority assignment in NB01 |
| **Key columns** | `sap`, `sku`, `Top_venta` (flag) |
| **How it's used** | LEFT JOIN — `Top_venta` determines `Prioridad` in NB01: priority 1 (push + top seller) vs priority 2 (push + non-top) |
| **Join keys** | `sap`, `sku` |
| **Volume estimate** | Medium — subset of store-SKUs flagged as top sellers |
| **Criticality** | **MEDIUM** — affects prioritization but not whether a recommendation is generated |
| **Foundry status** | **PARTIAL** — No standalone table in Snowflake. TOP column (binary flag) embedded in `SOP_PAC_PEDIDO_BASE` (185 rows, 1 store only). |
| **Notes** | Related but different from `top_tienda_nacional` (T13). This one is used in NB01 for priority; T13 is used in NB04 for PDF content. CSV sample: `Sku_insignia.csv` |

---

### T09 — `parrrillas`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query1.sql` |
| **Grain** | Store-SKU (promotional grid) |
| **Role** | Promotional grids with vigency — flags whether a store-SKU is in an active promotional plan |
| **Key columns** | `sap`, `sku`, `Parrilla` (grid name), `Inicio_vigencia`, `Fin_vigencia` |
| **How it's used** | LEFT JOIN — if today is within vigency, `Con_parrilla_activa = 1`. Passed through to downstream outputs |
| **Join keys** | `sap`, `sku` |
| **Volume estimate** | Medium |
| **Criticality** | **LOW** — informational flag, does not drive core push/cut logic |
| **Foundry status** | **UNCERTAIN** — Possible match: `SOP_PAC_PROMOCIONES` (2,914 rows, `ri.foundry.main.dataset.a120657f-e78e-4909-8ac6-c863ec7d3b77`). Needs schema comparison to confirm if promotions = parrillas. |
| **Notes** | Table name has triple-r (`parrrillas`). Part of the promotional table family. Related to "Parrilla" concept in glossary. CSV sample: `parrrillas.csv` |

---

### T10 — `Roles_pedido_nacional`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query2.sql`, `my_query5.sql` |
| **Grain** | Store |
| **Role** | Day-of-week ordering schedule — determines which stores receive alerts on which days |
| **Key columns** | `sap`, `Lunes`, `Martes`, `Miercoles`, `Jueves`, `Viernes`, `Sabado`, `Domingo` (all binary 0/1) |
| **How it's used** | NB02 maps the current weekday to Spanish, then filters stores where that day's column = 1 → `tiendas_que_piden_hoy`. NB01 saves enriched version as `df_rol.csv` for Excel |
| **Join keys** | `sap` |
| **Volume estimate** | Low — one row per store |
| **Criticality** | **HIGH** — controls the daily scope of the pipeline. Wrong schedule = wrong stores alerted |
| **Foundry status** | **MISSING** — Not in Snowflake. Not in Foundry. |
| **Notes** | This is a configuration/reference table, not transactional. May need governance rules in Foundry for who can update schedules. CSV sample: `Roles_pedido_nacional.csv` |

---

### T11 — `top_tienda_nacional`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query3.sql` |
| **Grain** | Store-SKU |
| **Role** | Store-SKU rankings nationally — determines which SKUs appear as "top sellers" in PDF alerts |
| **Key columns** | `sap`, `sku`, `top_tienda` (ranking number), `Menor3` (flag: 1 if ranking < 3) |
| **How it's used** | NB04 merges this with push alerts to show top-seller context in PDFs |
| **Join keys** | `sap` (joined to `mermas_autos_cat_tienda` for CEDI filter) |
| **Volume estimate** | High — rankings for all store-SKU combos |
| **Criticality** | **LOW** — enriches PDFs but doesn't affect recommendation logic |
| **Foundry status** | **MISSING** — Not in Snowflake. Not in Foundry. |
| **Notes** | Different from `Sku_insignia` (T08). This one provides full rankings for PDF display; T08 provides binary top-seller flags for priority logic. CSV sample: `top_tienda_nacional.csv` |

---

### T12 — `directorio_whatsapp`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query4.sql` |
| **Grain** | Store |
| **Role** | WhatsApp contact directory — phone numbers for alert distribution |
| **Key columns** | `sap`, `Cel_ejecutivo` (sales exec phone), `Cel_coordinadora` (coordinator phone) |
| **How it's used** | NB04 merges with alerts to build `archivo.csv` (phone + PDF URL pairs) for WhatsApp sending |
| **Join keys** | `sap` |
| **Volume estimate** | Low — one row per store |
| **Criticality** | **HIGH** for distribution — without this, no WhatsApp alerts are sent |
| **Foundry status** | **UNCERTAIN** — Possible match: `SOP_PAC_EMPLOYEES_COMERCIAL` (17,517 rows, `ri.foundry.main.dataset.3982141b-b2a7-4eec-958e-0a47f54c080d`). May contain phone numbers but needs schema verification. |
| **Notes** | In the Foundry target state, this maps to the `UserRoleAssignment` ontology object. Phone number `'0'` means "skip this contact". No validation currently exists. CSV sample: `directorio_whatsapp.csv` |

---

### T13 — `notas_pendientes`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query6.sql` |
| **Grain** | Store-Note (one row per financial note) |
| **Role** | Pending credit/debit notes — shown in PDF alerts for financial context |
| **Key columns** | `subsidiaria` (store ID, stored as string — CAST to int for join), `fecha`, `folio`, `mes` (aliased as `Comentario`), `importe` |
| **How it's used** | NB04 displays these in a brown/coffee-themed section of the per-store PDF. Aggregates total importe per store |
| **Join keys** | `CAST(subsidiaria AS int)` → `Sap` (type mismatch requires cast) |
| **Volume estimate** | Medium — multiple notes per store possible |
| **Criticality** | **LOW** — informational section in PDF, no impact on ordering logic |
| **Foundry status** | **[x] In Snowflake  [x] In Foundry** — `SOP_PAC_NOTAS_PENDIENTES` (384 rows, `ri.foundry.main.dataset.d9255028-f352-45b6-a6d1-15778f5af295`). Schema validated: CADENA, SAP, NOMBRETIENDA, SUCURSAL, RUTA, EJECUTIVO, ROC, GERENTE_ZONA, GERENTE_REGIONAL, KAM, FOLIO, IMPORTE, FECHA, ANIO, MONTH, MES, ESTATUS, FECHA_INFORMACION. |
| **Notes** | `mes` column (month) is repurposed as a comment field (`Comentario`). Snowflake version is richer than original — adds CADENA, NOMBRETIENDA, RUTA, EJECUTIVO, management hierarchy, ESTATUS. Type mismatch fixed (SAP is LONG). |

---

### T14 — `cabeceras_ultimo_dia`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server (likely a view) |
| **Used in** | `my_query7.sql` |
| **Grain** | Store-SKU (for most recent day) |
| **Role** | Last-day promotional headers — shown in PDF alerts to highlight active promotions |
| **Key columns** | `Sku`, `Prooducto` (note: double 'o'), `Inicio_vigencia`, `Fin_vigencia`, `Tipo_merma_ant`, `Objetivo_OH`, `OH_kilos`, `Peso` |
| **How it's used** | NB04 filters by `Sap` and displays in a green section. Computes `Inventario_teorico = OH_kilos / Peso` |
| **Join keys** | `Sap` (filtered in Python, not SQL) |
| **Volume estimate** | Medium — only the latest day's headers |
| **Criticality** | **LOW** — informational section in PDF |
| **Foundry status** | **[x] In Snowflake  [x] In Foundry** — `SOP_PAC_CABECERAS_ULTIMO_DIA` (19,797 rows, `ri.foundry.main.dataset.3b073f72-af36-409a-8480-ff6aa06eab87`). Dataset exists but returned 403 on query — may need permissions fix. |
| **Notes** | Likely a view on top of `mermas_autos_cabeceras` (T06) filtered to the most recent date. Column `Prooducto` has double 'o' — either DB column typo or actual name |

---

### T15 — `actividad_trade`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query8.sql` |
| **Grain** | Store-SKU-Activity |
| **Role** | Trade/promotional activities — shown in PDF alerts for active trade events |
| **Key columns** | `Sap`/`sap`, `Sku`, `Producto`, `Desc_trade` (trade description/price), `Inicio_vigencia`, `Fin_vigencia` |
| **How it's used** | Filtered to today's active events in SQL. NB04 displays in a green section, formatting `Desc_trade` as `"$X,XXX precio sugerido"` |
| **Join keys** | `Sap` (filtered in Python) |
| **Volume estimate** | Low-Medium — only currently active trade events |
| **Criticality** | **LOW** — informational section in PDF |
| **Foundry status** | **MISSING** — Not in Snowflake. Not in Foundry. |
| **Notes** | `Desc_trade` appears to contain numeric values (prices) that get formatted as currency. Part of the promotional data family. CSV sample: `actividad_trade.csv` |

---

### T16 — `mermas_autos_TC_Inventario_optimo`

| Attribute | Value |
|---|---|
| **Current location** | **`indicadoresdb`** (separate SQL Server database) |
| **Used in** | `my_query.sql` (standalone — not used by any notebook) |
| **Grain** | Store-SKU |
| **Role** | Pre-computed optimal inventory levels — used in standalone RL-class report |
| **Key columns** | `Sap`, `Sku`, `DOH` (days on hand), `Inventario_optimo`, `Inv_teorico` (theoretical inventory), `Peso`, `Clase`, `Tipo_merma`, `Region`, `Cedi`, `Cadena`, plus product dimensions |
| **How it's used** | Standalone query computes `Pedido_minimo_sugerido = Inventario_optimo - Inv_teorico` for RL-class products |
| **Join keys** | N/A (single-table query) |
| **Volume estimate** | High — one row per store-SKU |
| **Criticality** | **LOW for current pipeline** (standalone query). But this table represents a pre-computed version of what the pipeline calculates on the fly |
| **Foundry status** | **UNCERTAIN** — Possible match: `SOP_PAC_TC_RL` (95 rows, `ri.foundry.main.dataset.efbb2b62-5882-4fae-86c5-a240e38226bc`). RL classification table may be related. Needs schema comparison. |
| **Notes** | Different database (`indicadoresdb`) — may need separate Snowflake integration path. Contains a pre-computed optimal inventory that parallels the NB01 calculation but appears to use a different methodology. CSV sample: `mermas_autos_TC_Inventario_optimo.csv` |

---

### T17 — `mermas_autos_ItemReview_TD`

| Attribute | Value |
|---|---|
| **Current location** | SQL Server |
| **Used in** | `my_query9.sql` (standalone — not used by any notebook) |
| **Grain** | Store-SKU |
| **Role** | Comprehensive item review with multi-week forecasts and logistics recommendations |
| **Key columns** | `Sku`, `Sap`, `Fecha_actualizacion`, `Ordenado_LW`, `Recibido_LWTOP`, `Pedido_NS`, `Surtido_NS`, `Dbe_Pzas`, `Venta_prom`, `Forecast_Semana_prox/N2/N3`, `Recs_Semana_prox/N2/N3`, `Recomedacion_logistica`, `Clase_merma`, `Forecast_Accy`, `Tipo_Accy` |
| **How it's used** | Not used in active pipeline. Standalone exploration query returns full table |
| **Join keys** | `Sap`, `Sku` |
| **Volume estimate** | High |
| **Criticality** | **NOT USED in active pipeline**. However, contains forecast data that could be valuable for the target-state T3 (target_inventory_compute) stage |
| **Foundry status** | **N/A** — Not in Snowflake. Not needed for active pipeline. |
| **Notes** | Contains forward-looking forecast data (3-week horizon) and logistics recommendations. Typo: `Recomedacion_logistica`. This table is likely fed by the Walmart-specific 1,400-line SQL process mentioned in the March 17 meeting. CSV sample: `mermas_autos_ItemReview_TD.csv` |

---

### T18 — `proyeccion_detalle_pedidos`

| Attribute | Value |
|---|---|
| **Current location** | **MySQL** on HostGator (`162.241.61.143`, db: `sopor152_scrum_po`) |
| **Used in** | Notebook 02 (direct query, no .sql file) |
| **Grain** | Store-SKU-Order |
| **Role** | Customer order projections — the actual same-day orders that the pipeline compares against |
| **Key columns** | `sap`, `sku`, `Piezas_pedido` (ordered pieces), `id_cadena` (chain ID) |
| **How it's used** | NB02 queries `SELECT * WHERE id_cadena <> '123456'`, then merges on `[Sap, Sku]` to create `Pedido_original_cadena` |
| **Join keys** | `sap`, `sku` |
| **Volume estimate** | Medium-High — today's orders across all stores |
| **Criticality** | **CRITICAL** — without actual orders, the comparison (Stage 2) cannot happen. Pipeline only generates push/cut deltas |
| **Foundry status** | **[x] In Snowflake  [x] In Foundry** — `SOP_PROYECCION_DETALLE_PEDIDOS` (108,058 rows, `ri.foundry.main.dataset.0f7781b8-b2da-40ad-b730-dececcaee0b2`). Gate decision resolved: MySQL data now flows through Snowflake. Schema not yet validated (dataset exists but returned ViewsNotFound on master). |
| **Notes** | Originally on HostGator MySQL — **now migrated to Snowflake**. `id_cadena = '123456'` is excluded (likely test/dummy data). Also: `SOP_PROYECCION_CADENAS` (10 rows) and `SOP_PROYECCION_VALIDA_ENTREGA` (113 rows) are related projection tables. |

---

### T19 — `transitos.csv` (file-based input)

| Attribute | Value |
|---|---|
| **Current location** | Local file system |
| **Used in** | Notebook 01 |
| **Grain** | Shipment line item |
| **Role** | In-transit shipments — adds transit quantities to projected inventory |
| **Key columns** | `Solicitante` (maps to Sap), `Material` (maps to Sku), `Fecha entrega` (delivery date), `Cantidad` (quantity) |
| **How it's used** | NB01 filters to future deliveries, aggregates by `[Solicitante, Material]`, merges to add `Piezas_transito` to `OH_proyectado` |
| **Join keys** | `Solicitante → Sap`, `Material → Sku` |
| **Volume estimate** | Low-Medium |
| **Criticality** | **HIGH** — affects projected inventory calculation. Missing transit data means OH_proyectado = OH_Piezas (understated) |
| **Foundry status** | **MISSING** — Not in Snowflake. Not in Foundry. SAP-sourced data not yet integrated. |
| **Notes** | Encoding: latin1. Mixed data types cause DtypeWarning. Likely extracted from SAP (shipment/delivery documents). In target state, this should come from SAP integration |

---

## Criticality Summary

| Criticality | Tables | Role in Pipeline |
|---|---|---|
| **CRITICAL** | T01 (oh_SCAN), T02 (cat_tienda), T03 (cat_sku), T05 (pedido_sugerido), T07 (venta_scan), T18 (proyeccion_pedidos), T19 (transitos.csv) | Pipeline cannot produce meaningful output without these |
| **HIGH** | T04 (activo_tienda), T10 (roles_pedido), T12 (directorio_whatsapp) | Controls what gets recommended and to whom |
| **MEDIUM** | T06 (cabeceras), T08 (sku_insignia) | Enhances recommendations with promotional context and priority |
| **LOW** | T09 (parrrillas), T11 (top_tienda), T13 (notas_pendientes), T14 (cabeceras_ultimo_dia), T15 (actividad_trade) | Informational — displayed in PDFs but doesn't affect ordering logic |
| **NOT USED** | T16 (inventario_optimo), T17 (ItemReview_TD) | Standalone queries only — not in active pipeline |

---

## Pipeline Stage Mapping

This maps each table to the canonical transformation stages (T0-T10) defined in the target architecture.

| Stage | Name | Tables Required |
|---|---|---|
| T0 | `source_ingest` | All 19 tables/files |
| T1 | `source_standardization` | T02 (store catalog), T03 (SKU catalog) — dimension normalization |
| T2 | `inventory_baseline_compute` | T01 (oh_SCAN) — current inventory position |
| T3 | `target_inventory_compute` | T05 (pedido_sugerido: Tipo_merma), T07 (venta_scan: Scan_pizas), T06 (cabeceras: promotional objectives) |
| T4 | `transit_and_order_context_join` | T19 (transitos.csv), T18 (proyeccion_pedidos) |
| T5 | `delta_classification` | Computed from T2+T3+T4 outputs. T04 (activo_tienda) for eligibility, T08 (sku_insignia) for priority |
| T6 | `execution_routing` | T10 (roles_pedido: day schedule), T02 (cat_tienda: Cadena for retailer routing) |
| T7 | `execution_payload_generation` | T12 (directorio_whatsapp), T11 (top_tienda), T13 (notas_pendientes), T14 (cabeceras_ultimo_dia), T15 (actividad_trade) |
| T8-T10 | Reconciliation + Feedback | **Not yet implemented** — no tables exist for these stages |

---

## Migration Considerations

### Already discussed (from meeting notes)

- ~39 tables migrated to Snowflake as of March 27 (~40% of prioritized universe)
- A dump-assisted migration script already exists for SQL Server → Snowflake
- Tables flagged as needing manual/staged handling: `Lanzamientos`, `Cabeceras`, `Objetivos de Ventas`, `Ofertas`
- MySQL → Snowflake path still needs a gate decision (direct or via SQL Server)
- SAP integration: sales data most mature, orders-by-piece from Avap, at least one API landing directly in Snowflake

### Key questions per table for Foundry mapping

1. **Is it already in Snowflake?** → Check against the ~39 migrated tables
2. **Is the data fresh enough?** → Pipeline needs day-before-latest inventory; daily cadence target requires daily refresh
3. **Does a Foundry equivalent exist?** → Some tables may map to existing Foundry datasets from other workstreams
4. **Who owns the source?** → Some tables come from Pavis (external vendor), some from SAP, some from manual processes
5. **Does it need transformation before Foundry?** → Current SQL queries do inline transformations that Foundry pipelines should replicate

---

## Foundry / Snowflake Audit (2026-04-04)

This section was generated by querying Foundry live via Palantir MCP tools.

### Foundry Data Locations

| Location | Path | Contents |
|---|---|---|
| **Snowflake sync (main)** | `/Sigma Alimentos-45c2b9/Fuente de Datos - Snowflake/raw/` | 39 Snowflake datasets + 3 INFORMATION_SCHEMA views |
| **Pedido_optimo_previo/raw** | `/Sigma Alimentos-45c2b9/Pedido_optimo_previo/raw/` | 2 datasets (PAC_PEDIDO_BASE duplicate + CAT_TIENDAS with no data) |
| **Pedido_optimo_previo/Sqls_muestras** | `/Sigma Alimentos-45c2b9/Pedido_optimo_previo/Sqls_muestras/` | 40 CSV blobster files (samples, NOT queryable datasets) |
| **Alfonso's project** | `/Solanthic-da2629/Alfonso's project/` | 7 `pedido_optimo_*_nocional_*` datasets (ontology prototyping) |

### Full Snowflake Inventory (DB_GOLD.SC_MX_SD)

39 base tables synced from Snowflake. Last updated by `vicperezo@sigma-alimentos.com` on 2026-04-02.

| Snowflake Table | Rows | Foundry Dataset RID | Pipeline Match |
|---|---|---|---|
| `SOP_PAC_PEDIDO_BASE` | 185 | `ri.foundry.main.dataset.423bce3b-fbf9-49e4-b6aa-2438350d7482` | Pre-joined base (T02+T03+T05+T07+T08), 1 store only |
| `SOP_PAC_CAT_TIENDAS` | 104 | `ri.foundry.main.dataset.384369ef-50d4-4e4c-b8f6-b59ff72b04cd` | T02 (Pachuca subset) |
| `SOP_CAT_TIENDAS` | 5,912 | `ri.foundry.main.dataset.143ada88-a4d2-4133-a0c7-24693626b506` | T02 (national) |
| `SOP_PAC_CAT_ACTIVO_TIENDA` | 1,991,395 | `ri.foundry.main.dataset.203a4952-1820-45d1-8e9a-e19c97b920ff` | T04 |
| `SOP_PAC_CAT_ACTIVO_TIENDA_INVENTARIO_MODIF` | 0 | `ri.foundry.main.dataset.dd361c46-85d9-40b1-93b9-ef79ac744882` | — (empty) |
| `SOP_PAC_CABECERAS_ULTIMO_DIA` | 19,797 | `ri.foundry.main.dataset.3b073f72-af36-409a-8480-ff6aa06eab87` | T14 |
| `SOP_PAC_NOTAS_PENDIENTES` | 384 | `ri.foundry.main.dataset.d9255028-f352-45b6-a6d1-15778f5af295` | T13 |
| `SOP_PAC_PROMOCIONES` | 2,914 | `ri.foundry.main.dataset.a120657f-e78e-4909-8ac6-c863ec7d3b77` | T09? (uncertain) |
| `SOP_PAC_EMPLOYEES_COMERCIAL` | 17,517 | `ri.foundry.main.dataset.3982141b-b2a7-4eec-958e-0a47f54c080d` | T12? (uncertain) |
| `SOP_PROYECCION_DETALLE_PEDIDOS` | 108,058 | `ri.foundry.main.dataset.0f7781b8-b2da-40ad-b730-dececcaee0b2` | T18 |
| `SOP_PAC_MODIFICADO` | 28,795 | `ri.foundry.main.dataset.9b7e3784-8a31-4d4b-a03b-9ad9b26877e5` | — |
| `SOP_PAC_INVENTARIO_FANTASMA_AS` | 24,750 | `ri.foundry.main.dataset.7222dd52-e77f-4963-99c4-b9beb31689bd` | — |
| `SOP_PAC_KPI_SAMS` | 4,278 | `ri.foundry.main.dataset.2f9f7b1b-c9f3-41e2-a44b-5c9e8d829ab6` | — |
| `SOP_PAC_KPI_CITY_CLUB` | 491 | `ri.foundry.main.dataset.8df36d45-bd55-4119-8f4f-7d1ad1c6e24a` | — |
| `SOP_PAC_TC_RL` | 95 | `ri.foundry.main.dataset.efbb2b62-5882-4fae-86c5-a240e38226bc` | T16? (uncertain) |
| `SOP_PAC_RETENCIONES_WM` | 190 | `ri.foundry.main.dataset.29799a80-3888-4f88-bb35-20be03255627` | — |
| `SOP_PAC_ADICIONALES_WM` | 588 | `ri.foundry.main.dataset.58a4a7b6-1822-4f71-bc39-1aa89ace52a8` | — |
| `SOP_PAC_SAMS_MODIFICADO` | 91 | `ri.foundry.main.dataset.748ade0e-bc8b-4791-b433-dd87194adcae` | — |
| `SOP_PAC_PERIODOS` | 26 | `ri.foundry.main.dataset.07016c82-cd3a-4dfb-8117-8b31e49e3589` | — |
| `SOP_PAC_TAREAS` | 5 | `ri.foundry.main.dataset.4ea00c68-c015-40bd-84b1-e104d7db3cd0` | — |
| `SOP_PAC_COMENTARIOS` | 15 | `ri.foundry.main.dataset.66024bc3-d7d2-4c0e-8a08-d9ff11859cf9` | — |
| `SOP_PAC_CITY_CLUB_MODIFICADO` | 0 | `ri.foundry.main.dataset.1562aee5-dfde-4924-a31b-332856253f72` | — (empty) |
| `SOP_PROYECCION_CADENAS` | 10 | `ri.foundry.main.dataset.c626eb37-3745-4fbc-92b0-44aaf291a9a3` | — |
| `SOP_PROYECCION_VALIDA_ENTREGA` | 113 | `ri.foundry.main.dataset.3888cbba-61ac-49df-93cc-a98f8b71d7cf` | — |
| `SOP_VMN_LANZAMIENTOS` | 1,226 | `ri.foundry.main.dataset.17ead608-2ffa-4bb7-b411-602e7dfe3007` | — |
| `SOP_CARGA` | 2,854 | `ri.foundry.main.dataset.b4ccb250-e108-4c81-8b1c-849183d4c4eb` | — |
| `SOP_CARGA_1` | 824 | `ri.foundry.main.dataset.e3be609d-692d-4f05-829b-2842e0c04592` | — |
| `SOP_CAT_STATUS` | 2,085 | `ri.foundry.main.dataset.971f4fd4-5aa3-425e-8164-48b0446ddd81` | — |
| `SOP_AVANCE_TIENDA` | 2,894 | `ri.foundry.main.dataset.fcc7559d-e491-4dcd-92c8-00c04f397942` | — |
| `SOP_AVANCE_CELULA` | 474 | `ri.foundry.main.dataset.a7f36bd9-183a-4251-bc4d-bf43709a59ae` | — |
| `SOP_CAPTURA_INV` | 2,497 | `ri.foundry.main.dataset.6d243eee-55ec-497a-9935-e542a1a7f8b3` | — |
| `SOP_CAPTURA_INV_LANZAMIENTOS` | 2,564 | `ri.foundry.main.dataset.f792a9fb-87df-40f0-9289-b8ceae6d81c7` | — |
| `SOP_ASINGACION_INICIAL` | 11,361 | `ri.foundry.main.dataset.66f6af15-d989-481a-8080-8adc33fb9979` | — |
| `SOP_ASINGACION_VS_ENTREGA` | 17,899 | `ri.foundry.main.dataset.c0a34060-1ec5-4be4-a3fe-dd656220165b` | — |
| `SOP_NAVIDENO_ENTREGA` | 10,931 | `ri.foundry.main.dataset.a3b8613f-b276-4a67-b86e-10c5b12cc827` | — |
| `SOP_QRO_CAT_CLIENTES_DETALLE` | 80,811 | `ri.foundry.main.dataset.d26260e3-1aec-4d7c-9b3c-30778d9dac82` | — |
| `SOP_QRO_USO_PAGINA` | 1,922 | `ri.foundry.main.dataset.27b5149e-821e-43cd-bd34-9e975e595d11` | — |
| `TBL_RM_CTX` | 664,197,840 | `ri.foundry.main.dataset.58f47edb-3d3d-4125-b000-ea5a82f627c8` | — |
| `SHARING_SELLIN` | 865,678,662 | `ri.foundry.main.dataset.b42bc808-04ff-4a5d-9de1-e59e628bf20c` | — |

### Snowflake Source Connector

- **Name**: `Sigma Alimentos - Snowflake`
- **RID**: `ri.magritte..source.5c1de7f6-9126-4dac-980c-5cbd131300b6`
- **Location**: `/Sigma Alimentos-45c2b9/Pedido_optimo_previo/`

### Gap Summary

| Status | Count | Pipeline Tables |
|---|---|---|
| **AVAILABLE** | 5 | T02 (cat_tienda), T04 (activo_tienda), T13 (notas_pendientes), T14 (cabeceras_ultimo_dia), T18 (proyeccion_pedidos) |
| **PARTIAL** | 4 | T03 (cat_sku), T05 (pedido_sugerido), T07 (venta_scan), T08 (sku_insignia) — all embedded in PAC_PEDIDO_BASE (185 rows, 1 store) |
| **UNCERTAIN** | 3 | T09 (parrrillas→SOP_PAC_PROMOCIONES?), T12 (directorio→SOP_PAC_EMPLOYEES_COMERCIAL?), T16 (inventario_optimo→SOP_PAC_TC_RL?) |
| **MISSING** | 5 | T01 (oh_SCAN), T06 (cabeceras), T10 (roles_pedido), T15 (actividad_trade), T19 (transitos.csv) |
| **N/A** | 2 | T11 (top_tienda — LOW, missing), T17 (ItemReview — not used) |

### Key Findings

1. **T01 (oh_SCAN) is the #1 blocker** — daily inventory snapshots, CRITICAL, not in Snowflake at all
2. **MySQL→Snowflake gate resolved** — T18 (proyeccion_detalle_pedidos) now has 108K rows in Snowflake
3. **PAC_PEDIDO_BASE is a convenience table, not a replacement** — only 185 rows (1 store), flattens 5 source tables
4. **40 CSV samples in Sqls_muestras are blobster files** — schema references only, not usable in pipelines
5. **3 UNCERTAIN matches need human verification** — compare schemas with original SQL Server tables
6. **Some datasets return 403 or ViewsNotFound** — may need permissions or builds on correct branch
