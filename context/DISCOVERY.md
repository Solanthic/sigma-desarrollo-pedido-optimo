# Discovery: Pedido Optimo — Full Pipeline Analysis

## 1. Executive Summary

**Pedido Optimo** (Optimal Order) is Sigma Alimentos Mexico's operational pipeline for calculating optimal inventory orders across the autoservices (supermarket/retailer) channel, currently piloted in the **Pachuca CEDI** (distribution center).

The system runs daily across **5 sequential Python notebooks** and **10 SQL queries** (8 active + 2 standalone). It:

1. **Calculates** suggested inventory levels per store-SKU combination based on shrinkage classification, weekly sales velocity, and promotional context
2. **Compares** those suggestions against actual same-day customer orders to identify push opportunities (order more) and cut warnings (order less)
3. **Generates** per-store PDF alerts with actionable recommendations, pending credit notes, active promotions, and trade activations
4. **Distributes** alerts via WhatsApp through SFTP-hosted PDF links

The pipeline covers approximately **~10,000 store-SKU combinations** for the Pachuca pilot. The broader initiative targets national scaling to **~1 million SKU-store combinations** with daily calculation cycles, moving from the current Python/SQL Server/Excel stack to Palantir Foundry over Snowflake.

**Core formula**: `projected_inventory = current_OH + transit_qty`, then `delta = target_inventory - projected_inventory` determines whether to push, cut, or hold.

**Key context**: This codebase was built by **Enrique Morales** (Product Owner), who transitions to Sigma's global EPICAL team on **2026-05-04**. This is a critical continuity risk for the project.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DATA SOURCES                                       │
│                                                                              │
│  SQL Server (SIACECLU04\SIACESQLQAS)     MySQL (162.241.61.143)              │
│  ┌─────────────────────────────┐         ┌──────────────────────────┐        │
│  │ 17 tables:                  │         │ 1 table:                 │        │
│  │ • mermas_autos_* (inventory,│         │ • proyeccion_detalle_    │        │
│  │   catalogs, suggestions)    │         │   pedidos (customer      │        │
│  │ • Roles, Tops, Directory    │         │   orders via HostGator)  │        │
│  │ • Trade, Notes, Headers     │         └──────────┬───────────────┘        │
│  └──────────┬──────────────────┘                    │                        │
│             │                                       │                        │
│  indicadoresdb (separate SQL Server DB)    File System                       │
│  ┌─────────────────────────────┐         ┌──────────┴───────────────┐        │
│  │ • mermas_autos_TC_          │         │ • transitos.csv          │        │
│  │   Inventario_optimo         │         │ • Ajustes_pedido.xlsx    │        │
│  └─────────────────────────────┘         │ • Resumen_carga.xlsx     │        │
│                                          └──────────────────────────┘        │
└──────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PROCESSING PIPELINE                                   │
│                                                                              │
│  NB01 ──► NB02 ──► NB03 ──► NB04 ──► NB05                                  │
│  (base    (compare  (alert   (PDF     (SFTP                                 │
│  calc)    orders)   logs)    gen)     upload)                                │
│                                                                              │
│  Excel COM automation (win32com) acts as black-box intermediary              │
│  between NB01→NB02 (Ajustes_pedido.xlsx) and NB02→NB03/NB04                │
│  (Resumen_carga.xlsx)                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          OUTPUTS                                             │
│                                                                              │
│  SFTP (162.241.61.143:2222)              Web Host (soporteracu.com)          │
│  ┌──────────────────────────┐            ┌──────────────────────────┐        │
│  │ PDFs uploaded to:        │  ──────►   │ Public URLs served at:   │        │
│  │ /home1/sopor152/         │            │ soporteracu.com/shared/  │        │
│  │  public_html/shared/     │            │  analytics/impulso_pdf/  │        │
│  │  analytics/impulso_pdf/  │            └──────────┬───────────────┘        │
│  └──────────────────────────┘                       │                        │
│                                                     ▼                        │
│                                          ┌──────────────────────────┐        │
│                                          │ WhatsApp Distribution    │        │
│                                          │ archivo.csv → phone+URL  │        │
│                                          └──────────────────────────┘        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Execution Flow

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
│    Opens: Resumen_carga.xlsx (Excel refresh, 30-min timeout)       │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 3: Notebook 03 — Generate alert summaries for email          │
│    Reads: Resumen_carga.xlsx                                       │
│    Writes: alertas_mail.csv, Concentrado_impulso.csv,              │
│            Concentrado_recorte.csv                                 │
│    Note: Email macro is commented out — emails NOT being sent      │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 4: Notebook 04 — Generate PDF alerts for WhatsApp            │
│    Uses: my_query3.sql, my_query4.sql, my_query6.sql,              │
│          my_query7.sql, my_query8.sql                              │
│    Reads: Resumen_carga.xlsx, loguito.png                          │
│    Writes: PDFs in alertas_wp/impulso/ & alertas_wp/pedido_soriana/│
│            archivo.csv (phone+URL pairs), test.csv                 │
├─────────────────────────────────────────────────────────────────────┤
│  STEP 5: Notebook 05 — Upload PDFs to web host via SFTP            │
│    Reads: alertas_wp/impulso/*.pdf                                 │
│    Uploads to: soporteracu.com/shared/analytics/impulso_pdf/       │
│    Note: pedido_soriana/ PDFs are NOT uploaded (gap)               │
└─────────────────────────────────────────────────────────────────────┘

Standalone queries (not referenced by any notebook):
  • my_query.sql  — RL-class optimal order report
  • my_query9.sql — Item review with multi-week forecasts
```

---

## 4. SQL Query Analysis

### 4.1 `my_query.sql` — Optimal Order for RL Class (Standalone)

**Not used by any notebook** — appears to be a standalone/exploratory query.


| Aspect           | Detail                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Source table** | `indicadoresdb.db_owner.mermas_autos_TC_Inventario_optimo` (alias: `invO`)                      |
| **Database**     | `indicadoresdb` — different from the main SQL Server database                                   |
| **Purpose**      | Extract suggested minimum orders for RL-class (Refrigerados Largos) products needing restocking |


**Selected columns**: Sap, Tienda, Region, Cedi, Cadena, Clase, Familia, Linea, Presentacion, Marca, Upc, Sku, Producto, Peso, Inv_teorico, Vol_prom, Dme_prom, Merma_porcentaje, Tipo_merma, Venta_promedio

**Calculated fields**:


| Field                    | Logic                                                             |
| ------------------------ | ----------------------------------------------------------------- |
| `DOH_Actuales`           | `ROUND(invO.DOH, 2)`                                              |
| `Inventario_optimo`      | `ROUND(invO.Inventario_optimo, 0)`                                |
| `Pedido_minimo_sugerido` | `ROUND(invO.Inventario_optimo - invO.Inv_teorico, 0)`             |
| `Kilos_pedido_Sugerido`  | `ROUND(invO.Inventario_optimo - invO.Inv_teorico, 0) * invO.Peso` |


**Filters**: Clas`e =` 'RL'`, Inventario_optimo > Inv_teorico, Presentacion <>` 'GRANEL'`, suggested order > 5 units, Tipo_merma not in (`'Critica'`,` 'Inconsistente'`), Region IS NOT NULL

**Hardcoded values**: `'RL'`, `'GRANEL'`, `5` (min order threshold), `'Critica'`, `'Inconsistente'`

**Issues found**:


| Severity | Issue                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| HIGH     | Missing table alias: `invO.Inventario_optimo > Inv_teorico` — right side missing `invO.` prefix. Could cause wrong column resolution |
| LOW      | No NULL handling for `Peso` in Kilos calculation — division risk                                                                     |
| LOW      | Duplicate calculation of `Inventario_optimo - Inv_teorico` computed twice (in Pedido_minimo_sugerido and Kilos)                      |


---

### 4.2 `my_query1.sql` — Core Inventory Diagnostic (Used in Notebook 01)

**The main query of the entire pipeline.** Builds a full store-SKU snapshot joining 9 tables.


| Aspect              | Detail                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **Base table**      | `mermas_autos_cabeceras_oh_SCAN` (cab) — daily inventory snapshots                                    |
| **Dimension joins** | `mermas_autos_cat_tienda` (tie), `mermas_autos_cat_sku` (sku), `mermas_autos_cat_activo_tienda` (act) |
| **Fact joins**      | `mermas_autos_test_pedido_sugerido` (ped), `Venta_scan_semanal_prom` (vta_p)                          |
| **Reference joins** | `Sku_insignia` (ins), `mermas_autos_cabeceras` (cab_obj), `parrrillas` (parri)                        |
| **Date filter**     | `DATEADD(DAY, -1, (SELECT MAX(Fecha) FROM mermas_autos_cabeceras_oh_SCAN))` — day before latest       |
| **CEDI filter**     | `tie.Cedi = 'Pachuca'` (hardcoded)                                                                    |


**Calculated fields**:


| Field                            | Logic                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `OH_Piezas`                      | `OH_kilos / Peso` — rounded to 0 for packaged, 2 for GRANEL. Uses `NULLIF(sku.Peso, 0)` to prevent div/0                             |
| `Activa_cliente`                 | 1 if `act.operacion IS NOT NULL`, else 0                                                                                             |
| `Puede_pedir_op`                 | `act.operacion` if NOT NULL, else 0                                                                                                  |
| `Vol_promedio`                   | `ped.Vol_neto` (net volume from suggested order metrics)                                                                             |
| `Merma_promedio`                 | `ped.DME` (average daily shrinkage)                                                                                                  |
| `Inventario_sugerido`            | CASE on `Tipo_merma`: Ok → `(Scan_pizas/7)*14`, Alta → `*12`, Muy Alta → `*10`, Scritica → `*8`, Critica → `*7`, Inconsistente → `0` |
| `Reactivar_con_pedido_operacion` | 1 if `Tipo_merma IS NULL AND act.operacion = 1`                                                                                      |
| `Reactivar_con_pedido_central`   | 1 if `Tipo_merma IS NULL AND act.operacion = 0`                                                                                      |
| `Con_cabecera_activa`            | 1 if today BETWEEN `cab_obj.Inicio_vigencia` and `cab_obj.Fin_vigencia`                                                              |
| `Con_parrilla_activa`            | 1 if today BETWEEN `parri.Inicio_vigencia` and `parri.Fin_vigencia`                                                                  |


**Inventario_sugerido multiplier logic** (days-of-supply based on shrinkage classification):


| Tipo_merma    | Multiplier          | Equivalent        | Inventory Days          |
| ------------- | ------------------- | ----------------- | ----------------------- |
| Ok            | `(Scan_pizas/7)*14` | 2.0x weekly sales | 14 days                 |
| Alta          | `(Scan_pizas/7)*12` | 1.71x             | 12 days                 |
| Muy Alta      | `(Scan_pizas/7)*10` | 1.43x             | 10 days                 |
| Scritica      | `(Scan_pizas/7)*8`  | 1.14x             | 8 days                  |
| Critica       | `(Scan_pizas/7)*7`  | 1.0x              | 7 days                  |
| Inconsistente | 0                   | —                 | 0 days (do not suggest) |


**Hardcoded values**: `'Pachuca'`, `7` (weekly denominator), `14/12/10/8/7` (days multipliers), all `Tipo_merma` strings, `'GRANEL'`

**Issues found**:


| Severity | Issue                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH     | Typo `'Scritica'` inBase Tipo_merma CASE — likely should be `'Subcritica'` or `'S.Critica'`. Creates inconsistent shrinkage treatment |
| HIGH     | `NULLIF(7,0)` is redundant — 7 can never be 0. Used everywhere in the query                                                           |
| HIGH     | Table name `parrrillas` has triple-r — suspicious typo but likely matches actual DB table name                                        |
| MEDIUM   | NULL in `Scan_pizas` makes entire `Inventario_sugerido` NULL (no COALESCE protection)                                                 |
| MEDIUM   | Reactivation flags check NULL Tipo_merma from LEFT JOIN — could incorrectly flag unmatched records                                    |
| MEDIUM   | Typo in alias `Fin_vigencia_parilla` (missing 'r', should be `Fin_vigencia_parrilla`)                                                 |
| MEDIUM   | Typo in alias `Inicio_vigencia_cabecra` (missing 'e', should be `Inicio_vigencia_cabecera`)                                           |
| LOW      | Typo in alias `Fecha_Invetario` (missing 'n', should be `Fecha_Inventario`)                                                           |
| LOW      | Inconsistent column casing (`tie.cadena` vs `tie.Grupo`)                                                                              |
| LOW      | Space in WHERE clause `tie. Cedi` (works but non-standard)                                                                            |
| LOW      | Commented-out debug WHERE clause left in code (testing artifact)                                                                      |


---

### 4.3 `my_query2.sql` — National Ordering Roles (Used in Notebook 02)


| Aspect           | Detail                                  |
| ---------------- | --------------------------------------- |
| **Source table** | `Roles_pedido_nacional`                 |
| **SQL**          | `SELECT * FROM Roles_pedido_nacional`   |
| **Purpose**      | Load day-of-week ordering configuration |


**Table structure**: Columns per weekday (`Lunes`, `Martes`, `Miercoles`, `Jueves`, `Viernes`, `Sabado`, `Domingo`) with binary 1/0 flags per store (sap). Used to filter only stores that order on the current day.

**Issues found**:


| Severity | Issue                                               |
| -------- | --------------------------------------------------- |
| MEDIUM   | `SELECT` * anti-pattern — brittle to schema changes |
| LOW      | No filtering, no ordering                           |


---

### 4.4 `my_query3.sql` — Top Store Rankings by CEDI (Used in Notebook 04)


| Aspect            | Detail                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Source tables** | `top_tienda_nacional` (tops), `mermas_autos_cat_tienda` (tie)                          |
| **JOIN**          | `LEFT JOIN mermas_autos_cat_tienda tie ON tie.sap = tops.sap`                          |
| **WHERE**         | `tie.Cedi = 'Pachuca'`                                                                 |
| **Fields**        | `tops.sap`, `tops.sku`, `tops.top_tienda` (ranking), `tops.Menor3` (flag: ranking < 3) |


**Issues found**:


| Severity | Issue                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| MEDIUM   | LEFT JOIN + WHERE on `tie.Cedi` effectively becomes INNER JOIN — should use INNER JOIN or move filter to ON clause |


---

### 4.5 `my_query4.sql` — WhatsApp Directory by CEDI (Used in Notebook 04)


| Aspect            | Detail                                                       |
| ----------------- | ------------------------------------------------------------ |
| **Source tables** | `directorio_whatsapp` (dir), `mermas_autos_cat_tienda` (tie) |
| **JOIN**          | `LEFT JOIN mermas_autos_cat_tienda tie ON tie.sap = dir.sap` |
| **WHERE**         | `tie.Cedi = 'Pachuca'`                                       |
| **Fields**        | `dir.`* — includes `Cel_ejecutivo`, `Cel_coordinadora`       |


**Issues found**:


| Severity | Issue                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| HIGH     | LEFT JOIN + WHERE converts to INNER JOIN — stores without a match in `cat_tienda` are silently dropped |
| MEDIUM   | `SELECT dir.`* — unclear which columns are actually needed                                             |


---

### 4.6 `my_query5.sql` — Ordering Roles with Store Info (Used in Notebook 01)


| Aspect            | Detail                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Source tables** | `Roles_pedido_nacional` (rol), `mermas_autos_cat_tienda` (tie)                          |
| **JOIN**          | `LEFT JOIN mermas_autos_cat_tienda tie ON tie.Sap = rol.sap`                            |
| **WHERE**         | None — returns all stores                                                               |
| **Fields**        | `rol.`* + `tie.Tienda`, `tie.Grupo`, `tie.Cadena`, `tie.Region`, `tie.Zona`, `tie.cedi` |


**Issues found**:


| Severity | Issue                                                      |
| -------- | ---------------------------------------------------------- |
| MEDIUM   | `rol.`* may duplicate columns that also exist in tie table |
| LOW      | Inconsistent casing (`tie.Sap` vs `rol.sap`)               |


---

### 4.7 `my_query6.sql` — Pending Credit Notes by CEDI (Used in Notebook 04)


| Aspect            | Detail                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| **Source tables** | `notas_pendientes` (nota), `mermas_autos_cat_tienda` (tie)                                                    |
| **JOIN**          | `LEFT JOIN mermas_autos_cat_tienda tie ON tie.Sap = CAST(nota.subsidiaria AS int)`                            |
| **WHERE**         | `tie.Cedi = 'Pachuca'`                                                                                        |
| **Fields**        | `CAST(nota.subsidiaria AS int) AS Sap`, `fecha`, `folio`, `nota.mes AS Comentario`, `nota.importe AS Importe` |
| **ORDER BY**      | `nota.subsidiaria, nota.fecha`                                                                                |


**Issues found**:


| Severity | Issue                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| HIGH     | LEFT JOIN + WHERE converts to INNER JOIN                                                                                 |
| HIGH     | CAST in ON clause (`tie.Sap = CAST(nota.subsidiaria AS int)`) prevents index usage                                       |
| MEDIUM   | ORDER BY `nota.subsidiaria` uses string sort, but SELECT casts to int — different sort order for multi-digit numbers     |
| MEDIUM   | `nota.mes` (month) aliased as `Comentario` (comment) — semantic mismatch suggests column was repurposed without renaming |


---

### 4.8 `my_query7.sql` — Last Day Headers (Used in Notebook 04)


| Aspect            | Detail                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **Source table**  | `cabeceras_ultimo_dia` (likely a view)                                                     |
| **SQL**           | `SELECT * FROM cabeceras_ultimo_dia`                                                       |
| **Known columns** | Sku, Prooducto, Inicio_vigencia, Fin_vigencia, Tipo_merma_ant, Objetivo_OH, OH_kilos, Peso |


**Issues found**:


| Severity | Issue                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MEDIUM   | `SELECT` * anti-pattern                                                                                                                                                                        |
| MEDIUM   | Column `Prooducto` (double 'o') — likely a typo in the DB column name itself. Notebook 04 accesses this via `r.get('Prooducto', '')` — will return empty string if actual column is `Producto` |


---

### 4.9 `my_query8.sql` — Active Trade Activities (Used in Notebook 04)


| Aspect            | Detail                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Source table**  | `actividad_trade`                                                                                      |
| **SQL**           | `SELECT * FROM actividad_trade WHERE CAST(GETDATE() AS DATE) BETWEEN Inicio_vigencia AND Fin_vigencia` |
| **Known columns** | Sap/sap, Sku, Producto, Desc_trade, Inicio_vigencia, Fin_vigencia                                      |


**Issues found**:


| Severity | Issue                                                                |
| -------- | -------------------------------------------------------------------- |
| MEDIUM   | `SELECT` * anti-pattern                                              |
| LOW      | NULL in Inicio/Fin_vigencia silently excluded (BETWEEN returns NULL) |


---

### 4.10 `my_query9.sql` — Item Review with Forecasts (Standalone)

**Not used by any notebook** — standalone analysis query.


| Aspect           | Detail                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| **Source table** | `mermas_autos_ItemReview_TD` (alias: `td`)                                              |
| **SQL**          | SELECT with no WHERE clause — returns entire table                                      |
| **Purpose**      | Comprehensive item-level review with multi-week forecasts and logistics recommendations |


**Selected fields**: FechaHoy (`CONVERT(date, GETDATE())`), Fecha_revision_variable (from `Fecha_actualizacion`), Sku, Sap, Ordenado_LW, Recibido_LWTOP, Pedido_NS, Surtido_NS, Dbe_Pzas, Venta_prom, Venta_Semana_Anterior, Forecast_Semana_Anterior, Forecast_Semana_prox, Forecast_SemanaN2, Forecast_SemanaN3, Recs_Semana_prox, Recs_Semana_N2, Recs_Semana_N3, Recomedacion_logistica, Volumen_semanal_promedioKG, Merma_semanal_promedioKG, Clase_merma, Forecast_Accy, Tipo_Accy

**Issues found**:


| Severity | Issue                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| MEDIUM   | Typo `Recomedacion_logistica` (missing 'n', should be `Recomendacion_logistica`). May be a DB column name    |
| LOW      | Uses `CONVERT(date, GETDATE())` while my_query8 uses `CAST(GETDATE() AS DATE)` — inconsistent date functions |
| LOW      | No WHERE clause — returns entire table                                                                       |
| LOW      | Inconsistent naming (Forecast_Semana_prox vs Forecast_SemanaN2)                                              |


---

### 4.11 Cross-Query Issues


| Issue                            | Detail                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hardcoded 'Pachuca'**          | Queries 1, 3, 4, 6 all filter `tie.Cedi = 'Pachuca'`. No parameterization exists. To run for another CEDI, all queries must be manually edited |
| **Inconsistent date functions**  | `DATEADD/GETDATE()` in query1, `CAST(GETDATE() AS DATE)` in query8, `CONVERT(date, GETDATE())` in query9                                       |
| **Inconsistent column aliasing** | Mix of single quotes (`'DOH_Actuales'`), no quotes, and brackets across queries                                                                |
| **LEFT JOIN + WHERE pattern**    | Queries 3, 4, 6 all use LEFT JOIN but then filter on the joined table's column in WHERE, which effectively makes them INNER JOINs              |
| **SELECT * usage**               | Queries 2, 7, 8 use `SELECT` * — brittle to schema changes                                                                                     |


---

## 5. Python Notebook Analysis

### 5.1 Notebook 01 — `01_RL_TC_con_transitos.ipynb` — Build Base Inventory


| Aspect              | Detail                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Purpose**         | Creates foundational `base.csv` with all inventory calculations, push/cut logic, and priority flags |
| **Imports**         | warnings, pyodbc, numpy, pandas, datetime, os, shutil, win32com.client                              |
| **Connection**      | SQL Server via ODBC Driver 17 (credentials from `config.py`: `SIACECLU04\SIACESQLQAS`)              |
| **SQL queries**     | `my_query1.sql` (inventory snapshot), `my_query5.sql` (roles + store info)                          |
| **External inputs** | `transitos.csv` (encoding: latin1), `Ajustes_pedido.xlsx`                                           |
| **Outputs**         | `base.csv`, `emergencia/df_rol.csv`, `emergencia/Ajustes_pedido.xlsx` (copy)                        |


**Step-by-step business logic**:

1. Load inventory snapshot from SQL Server via `my_query1.sql` → DataFrame `df`
2. Load `transitos.csv` (in-transit shipments), filter to future deliveries (`Fecha entrega >= today`)
3. Aggregate transit by `[Solicitante, Material]` (sum of `Cantidad`), merge to df on `(Sap=Solicitante, Sku=Material)`
4. Compute `OH_proyectado = OH_Piezas + Piezas_transito` (both fillna(0))
5. Compute `Piezas_empuje` (push): IF `Tipo_merma = 'Ok'` AND `Inventario_sugerido > OH_proyectado` → difference, ELSE 0
6. Compute `No_cargar_pedido` (do-not-load flag): IF `Tipo_merma NOT IN ('Ok','Alta')` AND `OH_proyectado > Inventario_sugerido` → 1
7. Assign `Prioridad`: 1 = push needed + top-selling SKU, 2 = push needed + non-top SKU, 0 = no push
8. Compute `Empuje_cabecera` (header push): IF `Objetivo_cabecera - OH_proyectado > 0` AND `Con_cabecera_activa = 1` → difference
9. **Q-FRESCOS special rule**: Reduce `Piezas_empuje` to 33% (`* 0.33`) for `linea = 'Q-FRESCOS'`
10. Save as `base.csv`
11. Clear and recreate `emergencia/` folder, copy `Ajustes_pedido.xlsx` into it
12. Load ordering roles via `my_query5.sql`, save as `emergencia/df_rol.csv`
13. Open `Ajustes_pedido.xlsx` in Excel via COM, trigger `RefreshAll()`, show popup dialog

**Hardcoded values**: `0.33` (Q-FRESCOS multiplier), `'Ok'`, `'Alta'`, `'Q-FRESCOS'`, `'emergencia'` folder, `'latin1'` encoding

**Issues found**:


| Severity | Issue                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| CRITICAL | Uses `win32com.client` — Windows-only. Cannot run on Linux/Mac, blocks containerization                             |
| HIGH     | SyntaxWarning in `config.py` — invalid escape sequence in `SIACECLU04\SIACESQLQAS` (should use raw string `r'...'`) |
| HIGH     | Mixed data types in `transitos.csv` (DtypeWarning on multiple columns)                                              |
| MEDIUM   | Q-FRESCOS multiplier (0.33) applied AFTER priority assignment — intermediate values show pre-reduction push         |
| MEDIUM   | No validation that transit merge actually matched records                                                           |
| MEDIUM   | Excel COM automation may fail silently if Excel not installed or file locked                                        |
| LOW      | `ModuleNotFoundError` for `conn_mysql` in initial cell (never resolved, unused import)                              |
| LOW      | No check if SQL files exist before opening                                                                          |


---

### 5.2 Notebook 02 — `02_Compara_pedidos.ipynb` — Compare Suggested vs Actual Orders


| Aspect              | Detail                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**         | Merge system calculations with actual client orders, filter by today's ordering stores                                              |
| **Imports**         | warnings, pandas, openpyxl, pyodbc, numpy, config, datetime, locale, time, pathlib.Path, mysql.connector, win32com.client           |
| **Connections**     | SQL Server via ODBC + **MySQL** direct (credentials now via environment variables: `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) |
| **SQL queries**     | `my_query2.sql` (roles)                                                                                                             |
| **External inputs** | `Ajustes_pedido.xlsx` (sheet `base`, skiprows=7)                                                                                    |
| **Outputs**         | `resumen_pedido.csv`, `Resumen_carga.xlsx` (refreshed)                                                                              |


**Step-by-step business logic**:

1. Connect to MySQL, query `SELECT * FROM proyeccion_detalle_pedidos WHERE id_cadena <> '123456'`
2. Connect to SQL Server, load `Roles_pedido_nacional` via `my_query2.sql`
3. Read `Ajustes_pedido.xlsx` sheet `base` (header on row 8 after skiprows=7) — this is the Excel-refreshed output of NB01
4. Merge Excel data with MySQL customer orders on `[Sap, Sku]`, rename `Piezas_pedido` → `Pedido_original_cadena`
5. Determine current weekday (English → Spanish mapping: Monday → Lunes, etc.)
6. Filter `df_roles` where column matching current weekday = 1, extract `sap` list as `tiendas_que_piden_hoy`
7. Filter main DataFrame to only those stores
8. Save as `resumen_pedido.csv`
9. Open `Resumen_carga.xlsx` via COM, disable background queries, poll `OLEDBConnection.Refreshing` status with 1.5-sec intervals and 1800-second (30-min) timeout
10. Save refreshed `Resumen_carga.xlsx`

**Hardcoded values**: `'123456'` (excluded id_cadena — likely test/dummy), `1800` timeout, `1.5` polling interval, locale `'en_US.UTF-8'`, WindowState `-4143`

**Issues found**:


| Severity | Issue                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| RESOLVED | MySQL credentials moved to environment variables                                                                     |
| CRITICAL | Windows-only (`win32com.client`)                                                                                     |
| MEDIUM   | Duplicate filter line — same `df_calculo[df_calculo['Sap'].isin(tiendas_que_piden_hoy)]` applied twice consecutively |
| MEDIUM   | Day-of-week mapping relies on English locale — breaks if system locale differs                                       |
| MEDIUM   | No check if `dia_actual` column exists in df_roles                                                                   |
| LOW      | WindowState `-4143` undocumented magic number                                                                        |
| LOW      | `ModuleNotFoundError` for `conn_mysql` in initial cell                                                               |


---

### 5.3 Notebook 03 — `03_envia_alertas_por_mail.ipynb` — Generate Alert Summaries


| Aspect              | Detail                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Purpose**         | Extract alerts from Excel, append to cumulative CSV files                                          |
| **Imports**         | pandas, win32com.client, os, time, datetime                                                        |
| **Connections**     | None                                                                                               |
| **External inputs** | `Resumen_carga.xlsx` (sheet `resumen_pedido`, header=4)                                            |
| **Outputs**         | `alertas_mail.csv`, `Concentrado_impulso.csv` (cumulative), `Concentrado_recorte.csv` (cumulative) |


**Step-by-step business logic**:

1. Read `Resumen_carga.xlsx` sheet `resumen_pedido`
2. Export full sheet to `alertas_mail.csv`
3. **Impulso (Push) concentrado**: Filter `Con_algun_empuje == 1`, add `Fecha_ajuste` (YYYYMMDD format), select columns `[Fecha_ajuste, Sap, Sku, Pedido_original_cadena, Con_algun_empuje, Piezas a cargar]`, append to `Concentrado_impulso.csv`, deduplicate on `[Sap, Sku, Pedido_original_cadena, Con_algun_empuje, Piezas a cargar]`
4. **Recorte (Cut) concentrado**: Same logic for `Con_algun_recorte == 1`, saved to `Concentrado_recorte.csv`
5. (Commented out) VBA macro `EnviarReportesPorGrupo` — email sending is DISABLED

**Hardcoded values**: Sheet name `'resumen_pedido'`, header row `4`, date format `'%Y%m%d'`

**Issues found**:


| Severity | Issue                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH     | Deduplication doesn't include `Fecha_ajuste` in subset — same (Sap, Sku, order) record on different dates gets deduplicated incorrectly |
| MEDIUM   | Email macro commented out — the notebook's stated purpose ("envia alertas por mail") is not actually executed                           |
| MEDIUM   | No logging of records added/deduplicated                                                                                                |
| LOW      | No type conversion before concat (potential dtype mismatches)                                                                           |
| LOW      | Column order preservation not guaranteed in existing CSV                                                                                |


---

### 5.4 Notebook 04 — `04_envia_alertas_por_whatsapp.ipynb` — Generate PDF Alerts


| Aspect              | Detail                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**         | Generate multi-page PDF alerts per store for WhatsApp distribution                                                                        |
| **Imports**         | pandas, pyodbc, config, warnings, os, datetime, reportlab (colors, pagesizes, SimpleDocTemplate, Table, etc.), urllib.parse.quote         |
| **Connection**      | SQL Server via ODBC                                                                                                                       |
| **SQL queries**     | `my_query3.sql` (tops), `my_query4.sql` (WhatsApp directory), `my_query6.sql` (notes), `my_query7.sql` (headers), `my_query8.sql` (trade) |
| **External inputs** | `Resumen_carga.xlsx` (sheet `resumen_pedido`, header=4), `loguito.png`                                                                    |
| **Outputs**         | `alertas_wp/impulso/*.pdf`, `alertas_wp/pedido_soriana/*.pdf`, `archivo.csv`, `test.csv`                                                  |


**Step-by-step business logic**:

1. Load SQL data: top rankings (query3), WhatsApp contacts (query4), pending notes (query6), last-day headers (query7), trade activities (query8)
2. Read `Resumen_carga.xlsx`, filter: `(Activa_cliente==1 OR Puede_pedir_op==1) AND Con_algun_empuje==1`
3. Merge with top-store data and WhatsApp contacts
4. Compute `Piezas adicionales = Piezas a cargar - Pedido_original_cadena`
5. **Exclude Wal-Mart GRANEL items** (silently filtered out)
6. **Per non-Soriana store**, generate landscape PDF:
  - **Page 1** (Blue `#007BFF`): Push items — Sku, Producto, Scan_prom, Pedido_original_cadena, Piezas adicionales
  - **Page 2** (Red `#DC3545`): Cut items — Sku, Producto, Merma_% (calculated as `(-merma/vol)*100`, capped at `"1000%"` for undefined)
  - **Notas Pendientes section** (Brown `#7B5E3B`): Pending credit notes with coffee-themed styling
  - **Page 3** (Green `#28A745`): Active headers — Sku, Producto, vigency dates, Tipo_merma_ant, Objetivo_piezas, Inventario_teorico (`OH_kilos/Peso`)
  - **Page 4** (Green): Trade activations — `Desc_trade` formatted as `"$X,XXX precio sugerido"`
7. **Soriana special handling**: Separate folder (`pedido_soriana/`), simplified single-page PDF (only Sku, Producto, Scan_prom, Piezas a cargar), different base URL
8. Build PDF URL: `https://soporteracu.com/shared/analytics/impulso_pdf/{YYMMDD}_{sap}_{encoded_tienda}_oportunidad.pdf`
9. Save `archivo.csv` with `(Telefono, Url)` pairs — includes both `Cel_ejecutivo` and `Cel_coordinadora` (skips `'0'` coordinadora)

**Hardcoded values**: All color hex codes, `'loguito.png'`, `'Wal-Mart'` + `'GRANEL'` exclusion, `'Soriana'` separate flow, base URLs, `' precio sugerido'` suffix, `'()'` safe chars for URL encoding

**Issues found**:


| Severity | Issue                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| HIGH     | Soriana stores get simplified single-page PDF — missing cut warnings, header context, trade activations, pending notes |
| HIGH     | Wal-Mart GRANEL items excluded silently — no logging or flagging                                                       |
| MEDIUM   | `inv_teorico = OH_kilos / Peso` could divide by zero (no protection)                                                   |
| MEDIUM   | No phone number validation before writing to archivo.csv                                                               |
| MEDIUM   | `Piezas adicionales` can be negative (no floor or abs)                                                                 |
| MEDIUM   | `Prooducto` column access via `r.get('Prooducto', '')` — silent empty string if actual column is `Producto`            |
| LOW      | Missing logo silently skipped (`os.path.exists` check)                                                                 |
| LOW      | Folder clearing deletes all files regardless of type                                                                   |


---

### 5.5 Notebook 05 — `05_sube_pdf_a_host.ipynb` — Upload PDFs via SFTP


| Aspect                 | Detail                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| **Purpose**            | Upload generated PDFs to remote web server for WhatsApp link access |
| **Imports**            | os, paramiko                                                        |
| **Connection**         | SFTP (credentials now via environment variables: `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD`) |
| **Input**              | `alertas_wp/impulso/*.pdf`                                          |
| **Remote destination** | `/home1/sopor152/public_html/shared/analytics/impulso_pdf/`         |
| **Public URL**         | `https://soporteracu.com/shared/analytics/impulso_pdf/`             |


**Logic**: Iterate local `.pdf` files in `alertas_wp/impulso/`, `sftp.put()` each to remote path, print status, close connections.

**Issues found**:


| Severity | Issue                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| RESOLVED | SFTP credentials moved to environment variables                                                                               |
| HIGH     | No retry logic for failed uploads                                                                                             |
| HIGH     | No upload verification (no size check, no checksum)                                                                           |
| HIGH     | **Only uploads `impulso/` folder** — `pedido_soriana/` PDFs are generated but NEVER uploaded. Soriana WhatsApp links will 404 |
| MEDIUM   | Silent overwrites of remote files (no backup/versioning)                                                                      |
| MEDIUM   | `os.path.join()` for remote SFTP paths may produce wrong separators on Windows                                                |
| LOW      | No directory creation (assumes remote folder exists)                                                                          |
| LOW      | Broad exception catching hides real issues                                                                                    |


---

## 6. Table Classification

### 6.1 Source Tables (18 tables — populated externally, read-only by this pipeline)


| #   | Table                               | Database              | Used in        | Key Columns                                                      | Description                                             |
| --- | ----------------------------------- | --------------------- | -------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `mermas_autos_cabeceras_oh_SCAN`    | SQL Server            | query1         | Sap, Sku, Fecha, OH_kilos                                        | Daily inventory snapshots (on-hand in kilos)            |
| 2   | `mermas_autos_cat_tienda`           | SQL Server            | query1,3,4,5,6 | Sap, Tienda, Grupo, Cadena, Cedi, Region, Zona                   | Store master catalog                                    |
| 3   | `mermas_autos_cat_sku`              | SQL Server            | query1         | Sku, Producto, Familia, Linea, Presentacion, Marca, Peso         | SKU master catalog                                      |
| 4   | `mermas_autos_cat_activo_tienda`    | SQL Server            | query1         | sap, sku, operacion                                              | Active store-SKU combinations with operation flag       |
| 5   | `mermas_autos_test_pedido_sugerido` | SQL Server            | query1         | Sap, Sku, Vol_neto, DME, Tipo_merma, Tipo_de_precio, Pedido_prom | Suggested order metrics and shrinkage classification    |
| 6   | `mermas_autos_cabeceras`            | SQL Server            | query1         | Sap, sku, Inicio_vigencia, Fin_vigencia, Objetivo_OH             | Promotional header objectives with vigency dates        |
| 7   | `mermas_autos_ItemReview_TD`        | SQL Server            | query9         | Sku, Sap, Forecasts, Recommendations, Clase_merma                | Item review with multi-week forecasts                   |
| 8   | `mermas_autos_TC_Inventario_optimo` | **indicadoresdb**     | query0         | Sap, Sku, DOH, Inventario_optimo, Inv_teorico, Peso              | Pre-computed optimal inventory (different DB)           |
| 9   | `Sku_insignia`                      | SQL Server            | query1         | sap, sku, Top_venta                                              | Flagship/top SKUs per store                             |
| 10  | `Venta_scan_semanal_prom`           | SQL Server            | query1         | sap, sku, Scan_pizas                                             | Weekly average scanned sales (from Pavis)               |
| 11  | `parrrillas`                        | SQL Server            | query1         | sap, sku, Parrilla, Inicio_vigencia, Fin_vigencia                | Promotional grids with vigency (note: triple-r in name) |
| 12  | `Roles_pedido_nacional`             | SQL Server            | query2, query5 | sap, Lunes-Domingo (binary flags)                                | Ordering day-roles per store                            |
| 13  | `top_tienda_nacional`               | SQL Server            | query3         | sap, sku, top_tienda, Menor3                                     | Store-SKU rankings nationally                           |
| 14  | `directorio_whatsapp`               | SQL Server            | query4         | sap, Cel_ejecutivo, Cel_coordinadora                             | WhatsApp contacts per store                             |
| 15  | `notas_pendientes`                  | SQL Server            | query6         | subsidiaria, fecha, folio, mes, importe                          | Pending credit/debit notes                              |
| 16  | `cabeceras_ultimo_dia`              | SQL Server            | query7         | Sku, Prooducto, vigency dates, Objetivo_OH, OH_kilos             | Last-day promotional headers (likely a view)            |
| 17  | `actividad_trade`                   | SQL Server            | query8         | Sap, Sku, Producto, Desc_trade, vigency dates                    | Trade activities/promotions                             |
| 18  | `proyeccion_detalle_pedidos`        | **MySQL** (HostGator) | NB02 direct    | sap, sku, Piezas_pedido, id_cadena                               | Customer order projections                              |


### 6.2 Generated Artifacts (created by this pipeline)


| #   | Artifact                          | Type       | Producer         | Consumer                            | Description                                                      |
| --- | --------------------------------- | ---------- | ---------------- | ----------------------------------- | ---------------------------------------------------------------- |
| 1   | `base.csv`                        | CSV        | NB01             | Ajustes_pedido.xlsx (via Excel)     | Full inventory diagnostic with transit, projections, push logic  |
| 2   | `emergencia/df_rol.csv`           | CSV        | NB01             | Ajustes_pedido.xlsx                 | Enriched ordering roles for Excel workbook                       |
| 3   | `emergencia/Ajustes_pedido.xlsx`  | Excel copy | NB01             | NB02                                | Working copy of adjustments workbook                             |
| 4   | `resumen_pedido.csv`              | CSV        | NB02             | Resumen_carga.xlsx                  | Filtered orders for today's ordering stores                      |
| 5   | `Resumen_carga.xlsx`              | Excel      | NB02 (refreshed) | NB03, NB04                          | Key intermediate file with order comparison and computed columns |
| 6   | `alertas_mail.csv`                | CSV        | NB03             | (email system — currently disabled) | Full alert sheet export                                          |
| 7   | `Concentrado_impulso.csv`         | CSV        | NB03             | (historical log)                    | Cumulative push-order log (appended daily, deduplicated)         |
| 8   | `Concentrado_recorte.csv`         | CSV        | NB03             | (historical log)                    | Cumulative cut-order log (appended daily, deduplicated)          |
| 9   | `alertas_wp/impulso/*.pdf`        | PDFs       | NB04             | NB05                                | Per-store multi-page opportunity alerts                          |
| 10  | `alertas_wp/pedido_soriana/*.pdf` | PDFs       | NB04             | **NOT uploaded** (gap)              | Per-store Soriana-specific single-page PDFs                      |
| 11  | `archivo.csv`                     | CSV        | NB04             | (WhatsApp dispatch system)          | Phone + URL pairs for distribution                               |
| 12  | `test.csv`                        | CSV        | NB04             | (debug)                             | Cut-order items for debugging                                    |


### 6.3 External Excel Files (black-box intermediaries)


| File                  | Role                                                                    | Key Details                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ajustes_pedido.xlsx` | Master workbook with live SQL queries, formulas, and manual adjustments | Sheet `base` contains processed data. Refreshed via COM in NB01. Read in NB02 with `skiprows=7`                                                                 |
| `Resumen_carga.xlsx`  | Comparison workbook merging suggested vs actual orders                  | Sheet `resumen_pedido` (header=4). Contains computed columns: `Con_algun_empuje`, `Con_algun_recorte`, `Piezas a cargar`. Refreshed with 30-min timeout in NB02 |
| `transitos.csv`       | In-transit shipments                                                    | Columns: Solicitante, Material, Fecha entrega, Cantidad. Encoding: latin1. Date format: dd/mm/yyyy                                                              |
| `loguito.png`         | Company logo                                                            | Embedded in PDF headers. Skipped silently if missing                                                                                                            |


---

## 7. Data Flow Between Notebooks

```
                          SQL Server (17 tables)     MySQL (1 table)
                                  │                       │
                                  ▼                       │
┌────────────────────────────────────────────┐            │
│  NB01: RL_TC_con_transitos                 │            │
│  ├── Loads: my_query1.sql (inventory)      │            │
│  ├── Loads: my_query5.sql (roles)          │            │
│  ├── Reads: transitos.csv                  │            │
│  ├── Writes: base.csv ─────────────────┐   │            │
│  ├── Writes: emergencia/df_rol.csv ──┐ │   │            │
│  └── Copies: Ajustes_pedido.xlsx ──┐ │ │   │            │
└────────────────────────────────────┼─┼─┼───┘            │
                                     │ │ │                │
                            ┌────────┘ │ │                │
                            ▼          ▼ ▼                │
                    ┌──────────────────────┐              │
                    │  Ajustes_pedido.xlsx  │              │
                    │  (Excel refresh via   │              │
                    │   COM — BLACK BOX)    │              │
                    └──────────┬───────────┘              │
                               │                          │
                               ▼                          ▼
               ┌──────────────────────────────────────────────┐
               │  NB02: Compara_pedidos                       │
               │  ├── Reads: Ajustes_pedido.xlsx (sheet base) │
               │  ├── Loads: my_query2.sql (roles)            │
               │  ├── Queries: MySQL proyeccion_detalle_*     │
               │  ├── Writes: resumen_pedido.csv ───────┐     │
               │  └── Refreshes: Resumen_carga.xlsx ──┐ │     │
               └──────────────────────────────────────┼─┼─────┘
                                                      │ │
                              ┌────────────────────────┘ │
                              ▼                          ▼
                     ┌────────────────────┐   ┌─────────────────────┐
                     │ Resumen_carga.xlsx │   │ (feeds into Excel   │
                     │ (BLACK BOX:        │   │  via refresh)       │
                     │  Con_algun_empuje, │   └─────────────────────┘
                     │  Con_algun_recorte,│
                     │  Piezas a cargar)  │
                     └──────┬─────┬───────┘
                            │     │
                 ┌──────────┘     └──────────┐
                 ▼                           ▼
┌────────────────────────┐   ┌────────────────────────────────────┐
│  NB03: alertas_mail    │   │  NB04: alertas_whatsapp            │
│  ├── Reads: Excel      │   │  ├── Reads: Excel                  │
│  ├── Writes:           │   │  ├── Loads: query3,4,6,7,8         │
│  │   alertas_mail.csv  │   │  ├── Writes: impulso/*.pdf         │
│  │   Concentrado_*.csv │   │  ├── Writes: pedido_soriana/*.pdf  │
│  └── (email disabled)  │   │  └── Writes: archivo.csv           │
└────────────────────────┘   └──────────┬─────────────────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  NB05: sube_pdf      │
                             │  ├── Reads: impulso/  │
                             │  └── SFTP upload      │
                             │     → soporteracu.com │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  WhatsApp delivery    │
                             │  archivo.csv → phone  │
                             │  + public PDF URLs    │
                             └──────────────────────┘
```

---

## 8. Cross-Cutting Issues

### 8.1 Security


| #   | Severity | Issue                                                                                                      |
| --- | -------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | RESOLVED | MySQL credentials moved to environment variables (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) |
| 2   | RESOLVED | SFTP credentials moved to environment variables (`SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD`)                       |
| 3   | HIGH     | SQL Server credentials in `config.py` with SyntaxWarning (unescaped backslash) — `config.py` is .gitignored       |
| 4   | HIGH     | PDFs hosted on public URL without authentication (`soporteracu.com/shared/...`)                            |


### 8.2 Platform & Portability


| #   | Severity | Issue                                                                                                                                                                                                                                               |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | CRITICAL | ALL 5 notebooks use `win32com.client` (NB01-NB03 for Excel COM, NB04 imports it) — **Windows-only**, cannot run on Linux/Mac, blocks containerization, CI/CD, or cloud deployment                                                                   |
| 6   | HIGH     | Two Excel workbooks act as **black-box intermediaries** — they contain live SQL queries, formulas, and computed columns not visible in the codebase. `Ajustes_pedido.xlsx` and `Resumen_carga.xlsx` make the pipeline opaque and difficult to audit |
| 7   | MEDIUM   | Excel COM automation has 30-minute timeout and polls at 1.5-second intervals — fragile and slow                                                                                                                                                     |


### 8.3 Data Quality


| #   | Severity | Issue                                                                                                                              |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 8   | HIGH     | No data validation anywhere — no assertions, no row count checks, no schema validation. Silent failures are possible at every step |
| 9   | HIGH     | NULL `Scan_pizas` propagates as NULL `Inventario_sugerido`, causing silent gaps in recommendations                                 |
| 10  | MEDIUM   | No validation that transit merge matched records — unmatched transit data is silently ignored                                      |
| 11  | MEDIUM   | Mixed data types in `transitos.csv` causing DtypeWarning                                                                           |
| 12  | MEDIUM   | `Piezas adicionales` can be negative — no floor, no abs, no explicit handling                                                      |


### 8.4 Operational Risks


| #   | Severity | Issue                                                                                                                               |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 13  | HIGH     | **Soriana PDFs are generated but never uploaded** — NB05 only uploads `impulso/` folder. WhatsApp links for Soriana will return 404 |
| 14  | HIGH     | **Email alerts are disabled** — NB03 VBA macro is commented out, so no email distribution occurs                                    |
| 15  | HIGH     | No retry logic for SFTP uploads — any failure leaves partial upload state                                                           |
| 16  | HIGH     | No error recovery mechanism — if any notebook fails mid-execution, no rollback or resume exists                                     |
| 17  | MEDIUM   | Wal-Mart GRANEL items silently excluded from alerts — no logging, no visibility                                                     |
| 18  | MEDIUM   | Soriana stores receive simplified single-page PDFs — missing cut warnings, headers, trade, and notes sections                       |
| 19  | MEDIUM   | No upload verification in NB05 (no size check, no confirmation)                                                                     |
| 20  | LOW      | Hardcoded 'Pachuca' in 4 queries — no parameterization for other CEDIs                                                              |


### 8.5 Code Quality


| #   | Severity | Issue                                                                                                                                                                     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21  | HIGH     | Multiple typos in SQL aliases that propagate as column names: `Fecha_Invetario`, `Inicio_vigencia_cabecra`, `Fin_vigencia_parilla`, `Recomedacion_logistica`, `Prooducto` |
| 22  | MEDIUM   | `SELECT` * in 3 queries (2, 7, 8) — brittle to schema changes                                                                                                             |
| 23  | MEDIUM   | Duplicate filter line in NB02                                                                                                                                             |
| 24  | MEDIUM   | Deduplication in NB03 excludes date — same record on different dates is incorrectly deduped                                                                               |
| 25  | LOW      | Inconsistent date functions across queries (DATEADD, CAST, CONVERT)                                                                                                       |
| 26  | LOW      | Inconsistent column casing across queries                                                                                                                                 |
| 27  | LOW      | `NULLIF(7,0)` used everywhere in query1 — 7 is never 0                                                                                                                    |


---

## 9. Business Context from Meeting Notes

This section summarizes key context from the project's discovery sessions that informs how to interpret and eventually replace this pipeline.

### 9.1 Current State vs Target State


| Dimension          | Current State (this codebase)              | Target State                                                |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------- |
| **Scope**          | Pachuca CEDI only (~10K store-SKU combos)  | National autoservices (~1M store-SKU combos)                |
| **Cadence**        | Weekly (compute-constrained)               | Daily                                                       |
| **Stack**          | Python, SQL Server, Excel/VBA, MySQL, SFTP | Palantir Foundry over Snowflake                             |
| **Calculation**    | Fixed shrinkage multipliers                | Configurable retailer-specific rules                        |
| **Distribution**   | WhatsApp PDFs + disabled email             | Integrated dashboards + automated routing                   |
| **Reconciliation** | None                                       | Closed-loop: recommendation → SAP load → delivery → outcome |


### 9.2 Three-Stage Process Model

From the March 26 Python deep-dive, the pipeline follows three conceptual stages:

1. **Stage 1 — Inventory Position Calculation**: Calculate optimal inventory per store-SKU by comparing projected_inventory against target_inventory incorporating shrink/waste classes, pricing effects, and category exceptions. (Implemented in NB01)
2. **Stage 2 — Order Delta Computation**: Compare ideal position with same-day customer orders to generate delta_qty: reduce, add-to, or create order. (Implemented in NB02)
3. **Stage 3 — Retailer-Specific Execution Routing**: Route recommendations through retailer-specific lanes — Walmart can reduce orders directly but increases need forecast intervention; Soriana follows different approval paths. (Partially implemented in NB04 with Soriana/non-Soriana split)

### 9.3 Retailer Variants


| Retailer       | Operating Model                                               | Notes                                                                                      |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Walmart**    | Institutional — variable adjustments, Retail Link integration | ~378K SKU-store combos nationally. Uses `ZPCNC` SAP transaction for service-level tracking |
| **Soriana**    | Promoter-led mobile interaction                               | Gets simplified single-page PDF in current pipeline                                        |
| **Chedraui**   | Hybrid                                                        | Not yet detailed at Walmart-level depth                                                    |
| **Sam's Club** | Evaluation-based                                              | Managed by Daniel Marin                                                                    |


### 9.4 Key Operational Details

- Internal review is done in **kilos** for consistency; execution happens in **pieces** (downstream ordering systems are piece-based)
- The core projection formula: `real inventory + items in - items out - waste adjustment = projected inventory`
- Scanner-sales data comes from **Pavis** (vendor data feed)
- Emergency backup copies (`emergencia/` folder) are maintained when vendor data is stale or missing
- The MySQL table on HostGator (`proyeccion_detalle_pedidos`) is part of a **PHP-based web interface** that operations users interact with — it's a separate tool from this pipeline
- **Phantom inventory detection** (positive inventory but >21 days without sales) is part of the Walmart-specific extended logic, not in this Pachuca pipeline

### 9.5 Migration Timeline

- **Month 1 (Mar 15 - Apr 15, 2026)**: Workflow target + access foundation
- **Month 2 (Apr 16 - May 15)**: Data backbone + interfaces. **Enrique Morales departs May 4**
- **Month 3 (May 16 - Jun 15)**: Ontology v1, Walmart parity baseline
- **Month 4 (Jun 16 - Jul 15)**: Production readiness, UAT

### 9.6 Canonical Transformation Pipeline (Target)

The target architecture defines 11 transformation stages (T0-T10):


| Stage | Name                             | Maps to Current                                     |
| ----- | -------------------------------- | --------------------------------------------------- |
| T0    | `source_ingest`                  | SQL queries loading raw data                        |
| T1    | `source_standardization`         | Implicit in query column aliases                    |
| T2    | `inventory_baseline_compute`     | NB01: OH_Piezas + transit merge                     |
| T3    | `target_inventory_compute`       | NB01: Inventario_sugerido CASE logic                |
| T4    | `transit_and_order_context_join` | NB01: transitos.csv merge + NB02: MySQL order merge |
| T5    | `delta_classification`           | NB01: Piezas_empuje + NB02: order comparison        |
| T6    | `execution_routing`              | NB04: Soriana vs non-Soriana split                  |
| T7    | `execution_payload_generation`   | NB04: PDF generation + archivo.csv                  |
| T8    | `load_reconciliation`            | **Not implemented** — no closed loop                |
| T9    | `delivery_reconciliation`        | **Not implemented**                                 |
| T10   | `feedback_and_exception_memory`  | **Not implemented**                                 |


---

## 10. Complete Bug and Issue Registry

### CRITICAL (5)


| #   | Location      | Issue                                                                                                             |
| --- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| C1  | NB02          | **RESOLVED** — MySQL credentials moved to environment variables                                                       |
| C2  | NB05          | **RESOLVED** — SFTP credentials moved to environment variables                                                        |
| C3  | ALL           | Windows-only: all 5 notebooks use `win32com.client`. Cannot run on Linux/Mac                                      |
| C4  | my_query1.sql | Typo `'Scritica'` in Tipo_merma CASE — inconsistent shrinkage treatment (8d vs 7d for similarly-named categories) |
| C5  | NB05          | `pedido_soriana/` PDFs generated but NEVER uploaded — Soriana WhatsApp links will 404                             |


### HIGH (16)


| #   | Location      | Issue                                                                                    |
| --- | ------------- | ---------------------------------------------------------------------------------------- |
| H1  | my_query.sql  | Missing `invO.` alias on `Inv_teorico` in WHERE clause                                   |
| H2  | my_query1.sql | `NULLIF(7,0)` redundant — 7 can never be 0                                               |
| H3  | my_query1.sql | Table name `parrrillas` has triple-r (suspicious, may match actual DB name)              |
| H4  | my_query4.sql | LEFT JOIN + WHERE converts to INNER JOIN — silently drops unmatched stores               |
| H5  | my_query6.sql | LEFT JOIN + WHERE converts to INNER JOIN                                                 |
| H6  | my_query6.sql | CAST in ON clause prevents index usage                                                   |
| H7  | NB01          | `config.py` SyntaxWarning — invalid escape sequence in server name                       |
| H8  | NB01          | Mixed data types in transitos.csv (DtypeWarning)                                         |
| H9  | NB03          | Deduplication excludes `Fecha_ajuste` — same record on different dates appears duplicate |
| H10 | NB03          | Email macro commented out — no email alerts being sent                                   |
| H11 | NB04          | Soriana gets simplified single-page PDF (missing cut, headers, trade, notes sections)    |
| H12 | NB04          | Wal-Mart GRANEL excluded silently (no logging)                                           |
| H13 | NB05          | No retry logic for failed uploads                                                        |
| H14 | NB05          | No upload verification                                                                   |
| H15 | Pipeline      | No data validation anywhere — silent failures possible at every step                     |
| H16 | Pipeline      | No error recovery — partial writes with no rollback mechanism                            |


### MEDIUM (14)


| #   | Location      | Issue                                                                                               |
| --- | ------------- | --------------------------------------------------------------------------------------------------- |
| M1  | my_query1.sql | NULL Scan_pizas → NULL Inventario_sugerido (no COALESCE)                                            |
| M2  | my_query1.sql | Typos in aliases: `Fin_vigencia_parilla`, `Inicio_vigencia_cabecra`                                 |
| M3  | my_query6.sql | ORDER BY on uncast `subsidiaria` (string sort) vs SELECT CAST to int                                |
| M4  | my_query6.sql | `nota.mes` aliased as `Comentario` — semantic mismatch                                              |
| M5  | my_query7.sql | `Prooducto` column name (double 'o') — either DB typo or NB04 `r.get('Prooducto','')` returns empty |
| M6  | NB01          | Q-FRESCOS multiplier applied after priority assignment                                              |
| M7  | NB01          | No transit merge validation                                                                         |
| M8  | NB02          | Duplicate filter line                                                                               |
| M9  | NB02          | Day mapping relies on English locale                                                                |
| M10 | NB04          | Division by zero possible in `inv_teorico = OH_kilos / Peso`                                        |
| M11 | NB04          | No phone number validation                                                                          |
| M12 | NB04          | `Piezas adicionales` can be negative                                                                |
| M13 | NB05          | Silent remote file overwrites                                                                       |
| M14 | queries       | `SELECT` * in 3 queries (2, 7, 8)                                                                   |


### LOW (11)


| #   | Location      | Issue                                         |
| --- | ------------- | --------------------------------------------- |
| L1  | my_query1.sql | `Fecha_Invetario` alias typo                  |
| L2  | my_query1.sql | Inconsistent column casing                    |
| L3  | my_query1.sql | Commented-out debug WHERE clause              |
| L4  | my_query9.sql | `Recomedacion_logistica` typo                 |
| L5  | my_query9.sql | Inconsistent date functions vs other queries  |
| L6  | NB01          | `ModuleNotFoundError` for `conn_mysql`        |
| L7  | NB02          | `WindowState -4143` undocumented magic number |
| L8  | NB03          | No logging of records added/deduped           |
| L9  | NB04          | Missing logo silently skipped                 |
| L10 | NB04          | URL encoding with `safe='()'`                 |
| L11 | NB05          | No remote directory creation check            |


---

## 11. Glossary


| Term                            | Meaning                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **DOH**                         | Days on Hand — inventory coverage metric. `DOH = OH / daily_sales_avg`                                                      |
| **OH / OH_kilos / OH_Piezas**   | On-Hand inventory (in kilos or pieces). Internal review uses kilos; execution uses pieces                                   |
| **Merma / Tipo_merma**          | Shrinkage/waste/loss. Categories: Ok, Alta, Muy Alta, Scritica, Critica, Inconsistente. Determines safety-stock multipliers |
| **DME**                         | Average daily shrinkage (Desperdicio/Merma Estimada)                                                                        |
| **Pedido Optimo**               | Optimal/suggested order quantity — the primary output of this pipeline                                                      |
| **Empuje / Piezas_empuje**      | Push order — additional pieces to order beyond what customer requested. "You should order more"                             |
| **Recorte**                     | Cut — recommendation to reduce/not load an order. "You should order less"                                                   |
| **Cabecera**                    | Promotional header with inventory objectives and vigency dates                                                              |
| **Parrilla**                    | Promotional grid/plan with vigency — seasonal or campaign-driven promotions                                                 |
| **CEDI**                        | Distribution Center (Centro de Distribución). This pipeline runs for Pachuca CEDI only                                      |
| **SAP**                         | Store identifier code (Sap field). Also refers to SAP ERP system for order loading                                          |
| **SKU**                         | Product identifier code                                                                                                     |
| **Inventario_sugerido**         | System-calculated suggested inventory level (weekly sales × shrinkage multiplier)                                           |
| **OH_proyectado**               | Projected on-hand = current OH + in-transit shipments                                                                       |
| **Transitos / Piezas_transito** | In-transit shipments not yet received at store                                                                              |
| **Top_venta / Sku_insignia**    | Top-selling or flagship SKU flag per store                                                                                  |
| **Activa_cliente**              | Whether a store-SKU combination is active for ordering                                                                      |
| **Puede_pedir_op**              | Operational permission code for ordering (from `mermas_autos_cat_activo_tienda`)                                            |
| **Vol_neto**                    | Net volume                                                                                                                  |
| **Scan_pizas / Scan_prom**      | Scanned sales in pieces (weekly average). Source: Pavis scanner-sales feed                                                  |
| **GRANEL**                      | Bulk/unpackaged presentation — handled differently for rounding (2 decimals vs 0) and excluded for Wal-Mart alerts          |
| **Q-FRESCOS**                   | Fresh products line — gets 33% reduction in push recommendations                                                            |
| **Roles_pedido**                | Ordering roles — which days each store places orders (binary flags per weekday)                                             |
| **Notas_pendientes**            | Pending credit/debit notes (financial documents per store)                                                                  |
| **Actividad_trade**             | Trade/promotional activities with vigency dates and suggested pricing                                                       |
| **Vigencia**                    | Validity period (Inicio_vigencia to Fin_vigencia)                                                                           |
| **Pedido_original_cadena**      | Original chain/customer order quantity (from MySQL)                                                                         |
| **Piezas a cargar**             | Final pieces to load/ship (computed in Resumen_carga.xlsx — black box)                                                      |
| **Concentrado**                 | Cumulative historical log file (appended daily)                                                                             |
| **Clase**                       | Product class (e.g., RL = Refrigerados Largos — long-shelf refrigerated)                                                    |
| **Autoservicios**               | Supermarket/retail channel — the initial scope boundary for national scaling                                                |
| **ZPCNC**                       | SAP transaction for tracking requested vs delivered quantities (service-level)                                              |
| **Promotora**                   | Field promoter who does in-store inventory checks and order adjustments                                                     |
| **ROC**                         | Representante Operativo Comercial — commercial operations representative                                                    |
| **Retail Link**                 | Walmart's vendor data portal (Decision Support extracts)                                                                    |
| **Pavis**                       | Scanner-sales data vendor/feed used for average sales calculations                                                          |
| **EPICAL**                      | Sigma's new global team that Enrique Morales is transitioning to (May 4, 2026)                                              |


---

## 12. Data Sources Summary


| System                                | Connection                  | Tables/Role                                                           |
| ------------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| SQL Server (`SIACECLU04\SIACESQLQAS`) | ODBC via pyodbc (config.py) | 17 source tables (all `mermas_autos`_*, catalogs, trade, roles, etc.) |
| SQL Server (`indicadoresdb`)          | Same ODBC                   | 1 table (`mermas_autos_TC_Inventario_optimo`) — different database    |
| MySQL (env: `MYSQL_HOST`)             | mysql.connector (env vars)  | 1 table (`proyeccion_detalle_pedidos`) — HostGator shared hosting     |
| SFTP (env: `SFTP_HOST`)              | paramiko (env vars)         | Upload destination for PDFs — same host as MySQL                      |
| Web host (`soporteracu.com`)          | Public HTTPS                | PDF serving for WhatsApp links                                        |
| File system                           | Local                       | transitos.csv, Ajustes_pedido.xlsx, Resumen_carga.xlsx, loguito.png   |


