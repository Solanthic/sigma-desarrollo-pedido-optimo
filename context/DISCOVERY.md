# Discovery: Pedido Optimo — Full Pipeline Analysis

## Overview

This system calculates **optimal inventory orders** for Sigma's retail stores, compares them against actual customer orders, generates PDF alerts per store, and distributes them via WhatsApp. The pipeline runs sequentially across **10 SQL queries** and **5 Python notebooks**.

---

## Execution Flow (Step by Step)

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Notebook 01 — Build base inventory + suggested orders     │
│    Uses: my_query1.sql, my_query5.sql                              │
│    Reads: transitos.csv, Ajustes_pedido.xlsx                       │
│    Writes: base.csv, emergencia/df_rol.csv                         │
│    Opens: Ajustes_pedido.xlsx (Excel refresh with live queries)     │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 2: Notebook 02 — Compare suggested vs actual customer orders │
│    Uses: my_query2.sql                                             │
│    Reads: Ajustes_pedido.xlsx, MySQL proyeccion_detalle_pedidos     │
│    Writes: resumen_pedido.csv                                      │
│    Opens: Resumen_carga.xlsx (Excel refresh)                       │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 3: Notebook 03 — Generate alert summaries for email          │
│    Reads: Resumen_carga.xlsx                                       │
│    Writes: alertas_mail.csv, Concentrado_impulso.csv,              │
│            Concentrado_recorte.csv                                 │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 4: Notebook 04 — Generate PDF alerts for WhatsApp            │
│    Uses: my_query3.sql, my_query4.sql, my_query6.sql,              │
│          my_query7.sql, my_query8.sql                              │
│    Reads: Resumen_carga.xlsx                                       │
│    Writes: PDFs in alertas_wp/impulso/ & alertas_wp/pedido_soriana/│
│            archivo.csv (phone+URL pairs)                           │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 5: Notebook 05 — Upload PDFs to web host via SFTP            │
│    Reads: alertas_wp/impulso/*.pdf                                 │
│    Uploads to: soporteracu.com/shared/analytics/impulso_pdf/       │
└─────────────────────────────────────────────────────────────────────┘

Note: my_query.sql and my_query9.sql are NOT referenced by any notebook.
      They appear to be standalone/exploratory queries.
```

---

## SQL Query Deep Dive

### `my_query.sql` — Optimal Order for RL Class (Standalone)

**Not used by any notebook — appears to be a standalone report query.**

| Aspect | Detail |
|---|---|
| **Source table** | `indicadoresdb.db_owner.mermas_autos_TC_Inventario_optimo` |
| **Purpose** | Extract suggested minimum orders for RL-class (Refrigerados Largos) products |

**Logic:**
- Calculates `DOH_Actuales` (Days on Hand), `Inventario_optimo`, `Pedido_minimo_sugerido` (optimal - theoretical), and `Kilos_pedido_Sugerido` (order in kg)
- **Filters:** Class = `RL`, optimal > theoretical inventory, not GRANEL, suggested order > 5 units, excludes `Critica`/`Inconsistente` shrinkage, region not null
- **Order:** Region > Cedi > Cadena > Sap > Familia > Linea > Presentacion > Marca

---

### `my_query1.sql` — Core Inventory Diagnostic (Used in Notebook 01)

**The main query of the entire pipeline.** Builds a full store-SKU snapshot joining 8 tables.

| Aspect | Detail |
|---|---|
| **Main table** | `mermas_autos_cabeceras_oh_SCAN` (cab) — daily inventory snapshots |
| **Dimension joins** | `mermas_autos_cat_tienda` (tie), `mermas_autos_cat_sku` (sku), `mermas_autos_cat_activo_tienda` (act) |
| **Fact joins** | `mermas_autos_test_pedido_sugerido` (ped), `Venta_scan_semanal_prom` (vta_p) |
| **Reference joins** | `Sku_insignia` (ins), `mermas_autos_cabeceras` (cab_obj), `parrrillas` (parri) |
| **Date filter** | Day before the maximum date in `mermas_autos_cabeceras_oh_SCAN` |
| **CEDI filter** | `Pachuca` (hardcoded) |

**Calculated fields:**

| Field | Logic |
|---|---|
| `OH_Piezas` | `OH_kilos / Peso` — rounded to 0 for packaged, 2 for GRANEL |
| `Activa_cliente` | 1 if store-SKU exists in `cat_activo_tienda`, else 0 |
| `Puede_pedir_op` | Operation code from `cat_activo_tienda` or 0 |
| `Inventario_sugerido` | Days-of-supply multiplier based on `Tipo_merma`: Ok=14d, Alta=12d, Muy Alta=10d, Scritica=8d, Critica=7d, Inconsistente=0 |
| `Reactivar_con_pedido_operacion` | 1 if no merma type BUT operation is active (needs reactivation via operation) |
| `Reactivar_con_pedido_central` | 1 if no merma type AND operation is inactive (needs central reactivation) |
| `Con_cabecera_activa` | 1 if today is within header vigency dates |
| `Con_parrilla_activa` | 1 if today is within promotional grid vigency dates |

---

### `my_query2.sql` — National Ordering Roles (Used in Notebook 02)

| Aspect | Detail |
|---|---|
| **Source table** | `Roles_pedido_nacional` |
| **Purpose** | `SELECT *` — loads the full ordering roles config |

**Context from Notebook 02:** This table has columns per weekday (`Lunes`, `Martes`, etc.) with binary flags (1/0) indicating which days each store (sap) places orders. Used to filter only stores that order on the current day.

---

### `my_query3.sql` — Top Store Rankings by CEDI (Used in Notebook 04)

| Aspect | Detail |
|---|---|
| **Source tables** | `top_tienda_nacional` (tops), `mermas_autos_cat_tienda` (tie) |
| **CEDI filter** | `Pachuca` |
| **Fields** | `sap`, `sku`, `top_tienda` (ranking), `Menor3` (flag: ranking < 3) |
| **Purpose** | Identify top-selling SKUs per store to prioritize in alerts |

---

### `my_query4.sql` — WhatsApp Directory by CEDI (Used in Notebook 04)

| Aspect | Detail |
|---|---|
| **Source tables** | `directorio_whatsapp` (dir), `mermas_autos_cat_tienda` (tie) |
| **CEDI filter** | `Pachuca` |
| **Fields** | All from `directorio_whatsapp` including `Cel_ejecutivo`, `Cel_coordinadora` |
| **Purpose** | Get phone numbers for WhatsApp alert distribution |

---

### `my_query5.sql` — Ordering Roles with Store Info (Used in Notebook 01)

| Aspect | Detail |
|---|---|
| **Source tables** | `Roles_pedido_nacional` (rol), `mermas_autos_cat_tienda` (tie) |
| **No filter** | Returns all stores |
| **Fields** | All from roles + Tienda, Grupo, Cadena, Region, Zona, Cedi |
| **Purpose** | Enriched roles table saved as `emergencia/df_rol.csv` for the Ajustes Excel workbook |

---

### `my_query6.sql` — Pending Credit Notes by CEDI (Used in Notebook 04)

| Aspect | Detail |
|---|---|
| **Source tables** | `notas_pendientes` (nota), `mermas_autos_cat_tienda` (tie) |
| **CEDI filter** | `Pachuca` |
| **Fields** | Sap, fecha, folio, Comentario (aliased from `mes`), Importe |
| **Purpose** | Show pending financial notes in the PDF alert per store |

---

### `my_query7.sql` — Last Day Headers (Used in Notebook 04)

| Aspect | Detail |
|---|---|
| **Source table** | `cabeceras_ultimo_dia` |
| **Purpose** | `SELECT *` — promotional headers for the most recent day |
| **Context** | Used in the PDF to show "Cabeceras activas" (active promotion headers) per store, including columns: Sku, Prooducto, Inicio_vigencia, Fin_vigencia, Tipo_merma_ant, Objetivo_OH, OH_kilos, Peso |

---

### `my_query8.sql` — Active Trade Activities (Used in Notebook 04)

| Aspect | Detail |
|---|---|
| **Source table** | `actividad_trade` |
| **Filter** | Today's date between `Inicio_vigencia` and `Fin_vigencia` |
| **Purpose** | Currently active trade promotions shown in PDF as "Activaciones en la tienda" |
| **Context** | Uses columns: Sap/sap, Sku, Producto, Desc_trade, Inicio_vigencia, Fin_vigencia |

---

### `my_query9.sql` — Item Review with Forecasts (Standalone)

**Not used by any notebook — appears to be a standalone analysis query.**

| Aspect | Detail |
|---|---|
| **Source table** | `mermas_autos_ItemReview_TD` (td) |
| **Purpose** | Comprehensive item-level review with forecasts |

**Fields include:** Ordenado_LW, Recibido_LWTOP, Pedido_NS, Surtido_NS, Dbe_Pzas, multi-week forecasts (Forecast_Semana_prox/N2/N3), weekly recommendations (Recs_Semana_prox/N2/N3), Recomedacion_logistica, shrinkage class, forecast accuracy.

---

## Table Classification

### SOURCE TABLES (exist in the database, populated externally)

These are **not created** by any query or notebook in this pipeline. They are upstream dependencies:

| # | Table | Database | Used in | Description |
|---|---|---|---|---|
| 1 | `mermas_autos_cabeceras_oh_SCAN` | SQL Server | query1 | Daily inventory snapshots (OH in kilos) |
| 2 | `mermas_autos_cat_tienda` | SQL Server | query1,3,4,5,6 | Store master catalog |
| 3 | `mermas_autos_cat_sku` | SQL Server | query1 | SKU master catalog |
| 4 | `mermas_autos_cat_activo_tienda` | SQL Server | query1 | Active store-SKU combinations |
| 5 | `mermas_autos_test_pedido_sugerido` | SQL Server | query1 | Suggested order metrics (DME, Vol, merma type) |
| 6 | `mermas_autos_cabeceras` | SQL Server | query1 | Promotional header objectives with vigency |
| 7 | `mermas_autos_ItemReview_TD` | SQL Server | query9 | Item review with forecasts and logistics recs |
| 8 | `mermas_autos_TC_Inventario_optimo` | indicadoresdb | query0 | Pre-computed optimal inventory (different DB) |
| 9 | `Sku_insignia` | SQL Server | query1 | Flagship/top SKUs per store |
| 10 | `Venta_scan_semanal_prom` | SQL Server | query1 | Weekly average scanned sales |
| 11 | `parrrillas` | SQL Server | query1 | Promotional grids with vigency |
| 12 | `Roles_pedido_nacional` | SQL Server | query2, query5 | Ordering day-roles per store |
| 13 | `top_tienda_nacional` | SQL Server | query3 | Store-SKU rankings nationally |
| 14 | `directorio_whatsapp` | SQL Server | query4 | WhatsApp contacts per store |
| 15 | `notas_pendientes` | SQL Server | query6 | Pending credit/debit notes |
| 16 | `cabeceras_ultimo_dia` | SQL Server | query7 | Last-day promotional headers (likely a view) |
| 17 | `actividad_trade` | SQL Server | query8 | Trade activities with vigency |
| 18 | `proyeccion_detalle_pedidos` | **MySQL** (external) | notebook 02 | Customer order projections (different server) |

### GENERATED ARTIFACTS (created by this pipeline)

These are outputs produced during execution — **none of them are SQL tables**. The pipeline writes to files and Excel only:

| # | Artifact | Type | Generated by | Description |
|---|---|---|---|---|
| 1 | `base.csv` | CSV | Notebook 01 | Full inventory diagnostic with transit, projections, push logic |
| 2 | `emergencia/df_rol.csv` | CSV | Notebook 01 | Roles with store info for Excel |
| 3 | `emergencia/Ajustes_pedido.xlsx` | Excel (copy) | Notebook 01 | Working copy of adjustments workbook |
| 4 | `resumen_pedido.csv` | CSV | Notebook 02 | Filtered orders for today's ordering stores |
| 5 | `Resumen_carga.xlsx` | Excel | Notebook 02 | **Key intermediate file** — refreshed Excel with order comparison |
| 6 | `alertas_mail.csv` | CSV | Notebook 03 | Alert data for email distribution |
| 7 | `Concentrado_impulso.csv` | CSV | Notebook 03 | Historical push-order log (appended daily) |
| 8 | `Concentrado_recorte.csv` | CSV | Notebook 03 | Historical cut-order log (appended daily) |
| 9 | `alertas_wp/impulso/*.pdf` | PDFs | Notebook 04 | Per-store order opportunity alerts |
| 10 | `alertas_wp/pedido_soriana/*.pdf` | PDFs | Notebook 04 | Per-store Soriana-specific order PDFs |
| 11 | `archivo.csv` | CSV | Notebook 04 | Phone + URL pairs for WhatsApp sending |
| 12 | `test.csv` | CSV | Notebook 04 | Debug export of cut-order alerts |

### EXTERNAL EXCEL FILES (pre-existing, used as input)

| File | Role |
|---|---|
| `Ajustes_pedido.xlsx` | Master workbook with live SQL queries, formulas, and manual adjustments. Sheet `base` contains the processed data. |
| `Resumen_carga.xlsx` | Comparison workbook with sheet `resumen_pedido` that merges suggested orders with actual customer orders. Contains computed columns like `Con_algun_empuje`, `Con_algun_recorte`, `Piezas a cargar`. |
| `transitos.csv` | In-transit shipments with delivery dates and quantities |

---

## Key Business Logic (Notebook 01)

The core order calculation happens in Notebook 01 **after** my_query1.sql loads the base data:

```
OH_proyectado = OH_Piezas + Piezas_transito (in-transit)

Piezas_empuje (push pieces):
  IF Tipo_merma = 'Ok' AND Inventario_sugerido > OH_proyectado
  THEN Inventario_sugerido - OH_proyectado
  ELSE 0

No_cargar_pedido (do not load order):
  IF Tipo_merma NOT IN ('Ok', 'Alta') AND OH_proyectado > Inventario_sugerido
  THEN 1 (flag)

Prioridad:
  1 = Push needed + Top selling SKU
  2 = Push needed + Non-top SKU
  0 = No push needed

Empuje_cabecera (header push):
  IF Objetivo_cabecera - OH_proyectado > 0 AND cabecera is active
  THEN difference
  ELSE 0

Special rule: Q-FRESCOS line gets push reduced to 33% (× 0.33)
```

---

## Data Sources Summary

| System | Connection | Tables Used |
|---|---|---|
| SQL Server (`SIACECLU04\SIACESQLQAS`) | ODBC via pyodbc | 17 tables (all `mermas_autos_*`, catalogs, trade, roles, etc.) |
| MySQL (`162.241.61.143`) | mysql.connector | 1 table (`proyeccion_detalle_pedidos`) |
| SFTP (`162.241.61.143:2222`) | paramiko | Upload destination for PDFs |
| Web host | `soporteracu.com` | PDF serving URL for WhatsApp links |

---

## Observations & Risks

1. **Hardcoded CEDI filter:** Queries 1, 3, 4, 6 are hardcoded to `Pachuca`. To run for another CEDI, all queries must be manually edited.
2. **No tables are created by this pipeline** — all SQL queries are read-only SELECTs. The pipeline produces CSVs, Excel files, and PDFs only.
3. **Heavy Excel dependency:** `Ajustes_pedido.xlsx` and `Resumen_carga.xlsx` are critical intermediate files that contain live queries and formulas not visible in this codebase. They are black boxes.
4. **Credentials in plain text:** MySQL and SFTP credentials are hardcoded in notebooks 02 and 05.
5. **Unused queries:** `my_query.sql` and `my_query9.sql` are not referenced by any notebook.
6. **Typo in source table:** `parrrillas` (triple r) — likely a real table name, not a code typo.
7. **Windows-only:** Uses `win32com.client` for Excel automation — cannot run on Linux/Mac.
