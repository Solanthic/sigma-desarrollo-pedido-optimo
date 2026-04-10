# Ontology → Raw Dataset Mapping (IND_* sources only)

Generated 2026-04-09. Source: `IND_*` and `SC_MX_SD` datasets in `/Sigma Alimentos-45c2b9/Fuente de Datos - Snowflake /raw`

**Rule**: `SOP_*` datasets are from a different system and excluded. `IND_*` are the correct sources — Sigma is actively populating them. We map against schemas even when row count is 0.

---

## Dataset Inventory (IND_* and SC_MX_SD only)

| Dataset | RID | Rows | Schema Summary |
|---------|-----|------|----------------|
| IND_MERMAS_AUTOS_CAT_TIENDA | `5555d546` | 0 | SAP, TIENDA, REGION, CEDI, CADENA, GRUPO, ZONA, LUNES-SABADO, ESTATUS, ACTIVA + 20 more (41 cols) |
| IND_MERMAS_AUTOS_CAT_SKU | `9dbe82bc` | 0 | SKU, PRODUCTO, FAMILIA, LINEA, PRESENTACION, MARCA, PESO, CLASE + 7 more (15 cols) |
| IND_MERMAS_AUTOS_CAT_SKU_SORIANA | `00559849` | ? | Soriana-specific SKU catalog |
| IND_MERMAS_AUTOS_CAT_TIENDA_CELULA | `3b35279b` | ? | Store-to-cell mapping |
| IND_MERMAS_AUTOS_CAT_ACTIVO_TIENDA | `0051bb71` | 10,000 | SAP, SKU, OPERACION |
| IND_MERMAS_AUTOS_TIPO_MERMA_ANUAL | `6c94fd4e` | 10,000 | SAP, SKU, TIPO_MERMA_ANUAL, TIPO_MERMA_TRIMESTRAL, LAST_MERMA_PER |
| IND_MERMAS_AUTOS_TC_CAT_SKU | `f42a0cf7` | ? | SKU, CLASE |
| IND_MERMAS_AUTOS_TC_INVENTARIO_OPTIMO | `075283e6` | 0 | COMBINACION, UPC, SKU, CLASE, PRODUCTO, FAMILIA, LINEA, PRESENTACION, MARCA, PESO, SAP, TIENDA, REGION, ZONA, CADENA, CEDI, INV_TEORICO, PEDIDO_PROM, VOL_PROM, DME_PROM, MERMA_PORCENTAJE, TIPO_MERMA, VENTA_PROMEDIO, DOH, INVENTARIO_OPTIMO, NIVELACION_RESURTIDO, RECORTE_RESURTIDO, PEDIDO_MAXIMO (28 cols) |
| IND_MERMAS_AUTOS_CABECERAS_OH_SCAN | `cf075434` | 10,000 | SKU, SAP, FECHA, SCAN_KILOS, OH_KILOS |
| IND_MERMAS_AUTOS_CABECERAS | `1eec3b41` | 0 | SAP, SKU, SCAN_PROM, OBJETIVO_PZAS_ADICIONAL, OBJETIVO_OH, VOL_PROM_ANT, MERMA_PROM_ANT, TIPO_MERMA_ANT, PESO, PROODUCTO, FAMILIA, LINEA, MARCA, INICIO_VIGENCIA, FIN_VIGENCIA, CADENA, NOMBRE_CABECERA (17 cols) |
| IND_MERMAS_AUTOS_SCAN_SEM | `56dc2ee6` | has data | SEMANA, SAP, SKU, VOLUMEN, IMPORTE, CONSECUTIVO_SEMANA, ANO |
| IND_VENTA_SCAN_SEMANAL_PROM | `38e2e902` | 0 | SAP, SKU, PESO, SCAN_PIZAS |
| IND_SELL_OUT_OH_DIARIOS_28 | `10394d10` | 0 | FECHA, SAP, SKU, OH_KILOS, SCAN_KILOS |
| IND_SELL_IN_SELL_OUT28 | `75f24ec2` | 0 | FECHA, SAP, SKU, OH_KILOS, SCAN_KILOS, ENTREGAS_KILOS, POR_MERMA_RECIENTE, INSIGNIA_TOP_VENTA |
| IND_SELL_IN_AS_DIARIO | `184e0582` | 0 | FECHA, SAP, SKU, VOL_BRUTO, DBE |
| IND_CABECERAS_ULTIMO_DIA | `9ff76fe2` | 0 | SAP, SKU, SCAN_PROM, OBJETIVO_OH, OH_KILOS, PESO, PROODUCTO, FAMILIA, LINEA, MARCA + more (19 cols) |
| IND_ROLES_PEDIDO_NACIONAL | `0882f484` | 0 | SAP, LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO |
| IND_DIRECTORIO_WHATSAPP | `4ea4a5be` | 73 | SAP, CEL_EJECUTIVO, CEL_COORDINADORA, CEL_PROMOTORA1, CEL_PROMOTORA2 |
| IND_NOTAS_PENDIENTES | `d853ea67` | 0 | CADENA, SUBSIDIARIA, NOMBRETIENDA, SUCURSAL, RUTA, EJECUTIVO, ROC, GERENTE_ZONA, GERENTE_REGIONAL, KAM, FOLIO, IMPORTE, FECHA, ANO, MONTH, MES, ESTATUS, FECHA_INFORMACION (18 cols) |
| IND_ACTIVIDAD_TRADE | `a58d0b6e` | 673 | SAP, SKU, PRODUCTO, DESC_TRADE, INICIO_VIGENCIA, FIN_VIGENCIA |
| IND_PARRRILLAS | `e7576b20` | 0 | SAP, SKU, PARRILLA, INICIO_VIGENCIA, FIN_VIGENCIA |
| IND_SKU_INSIGNIA | `af640015` | ? | Flagship SKU flags |
| IND_SKU_BOTTOM | `f07f2a8a` | ? | Bottom SKU flags |
| TBL_RM_CTX | `c02a0e1d` | backfilling | BILL_NUM, BILL_ITEM, YEAR_MONTH/WEEK, CUSTOMER_ID, MATERIAL_ID, BILL_QTY, VOLUME_DELIVERED, NET_SALES, etc. (40 cols) |
| SHARING_SELLIN | `ba8438c0` | backfilling | Same as TBL_RM_CTX minus a few cols (38 cols) |
| TBL_MXN_RTM_SKU | `10d98058` | 8,770,812 | MATERIAL, MATERIAL_TXT, MARCA, LINEA, PRESENTACION, FAMILIA, VENTA_MXN, VOLUMEN, etc. (43 cols) |

---

## Mapping Summary

| # | Object Type | Backing Dataset | Data Status | Confidence |
|---|-------------|----------------|-------------|------------|
| 1 | Store | `IND_MERMAS_AUTOS_CAT_TIENDA` | Awaiting data | **High** — schema is perfect (41 cols) |
| 2 | Product | `IND_MERMAS_AUTOS_CAT_SKU` | Awaiting data | **High** — schema is perfect (15 cols) |
| 3 | ProductLine | Derived from Product (LINEA) | Depends on #2 | **High** |
| 4 | DistributionCenter | Derived from Store (CEDI) | Depends on #1 | **High** |
| 5 | RetailChain | Derived from Store (CADENA) | Depends on #1 | **High** |
| 6 | StoreProductAssignment | `IND_MERMAS_AUTOS_CAT_ACTIVO_TIENDA` + enrichment | **Has data** (10K) | **High** |
| 7 | SellOut | `IND_MERMAS_AUTOS_CABECERAS_OH_SCAN` | **Has data** (10K) | **Medium** — 10K might be capped |
| 8 | SellIn | `TBL_RM_CTX` / `SHARING_SELLIN` | **Backfilling** | **Medium** — need to clarify difference between the two tables |
| 9 | Promotion | `IND_MERMAS_AUTOS_CABECERAS` | Awaiting data | **High** — has promotion columns |
| 10 | PromotionalGrid | `IND_PARRRILLAS` | Awaiting data | **High** — schema matches |
| 11 | TradeActivity | `IND_ACTIVIDAD_TRADE` | **Has data** (673) | **High** |
| 12 | PendingNote | `IND_NOTAS_PENDIENTES` | Awaiting data | **High** — schema matches |
| **13** | **Shipment (NEW)** | T19 `transitos.csv` — **not in Foundry yet** | **Gap** | Sigma shared sample. Schema: Solicitante, Material, Fecha entrega, Cantidad |

---

## Detailed Mapping by Object

### 1. Store

**Backing**: `IND_MERMAS_AUTOS_CAT_TIENDA` — `ri.foundry.main.dataset.5555d546-6e8a-4bf7-bfc5-85b2e72cc858`

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| sapCode | SAP | Ready |
| storeName | TIENDA | Ready |
| storeGroup | GRUPO | Ready |
| retailChainId | CADENA | Ready |
| distributionCenterCode | CEDI | Ready |
| region | REGION | Ready |
| zone | ZONA | Ready |
| isActive | ACTIVA / ESTATUS | Ready (two candidate columns) |
| orderingDays | LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO | Ready — collapse to array |
| executivePhone | — | **Enrich from** `IND_DIRECTORIO_WHATSAPP` (73 rows) |
| coordinatorPhone | — | **Enrich from** `IND_DIRECTORIO_WHATSAPP` |

**Extra columns available**: NOM_EJE, EJECUTIVO, PERFIL, RUTA, TAMANO, SEGMENTO, FORMATO, CLAVE_MODELO, MERMA_DIRECCIONADOR, COORDENADAS, TOPSCAN, TOPSEM, SUBFORMATO, EMAIL, GERENTE_DE_ZONA, ROC, CELULA, ESTADO_CLAVE, CLASE_NOTAS, ROL_PEDIDO, NUMERO_INTERNO_CADENA, NIELSEN, ROL

**Assessment**: Perfect fit. This single dataset covers all Store properties including ordering days and active status. The extra columns (ROC, CELULA, FORMATO, GERENTE_DE_ZONA) could enrich the ontology later. Transform needed only for orderingDays (7 boolean → array) and WhatsApp join.

---

### 2. Product

**Backing**: `IND_MERMAS_AUTOS_CAT_SKU` — `ri.foundry.main.dataset.9dbe82bc-1625-4880-b34a-cef5141706a2`

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| sku | SKU | Ready |
| productName | PRODUCTO | Ready |
| family | FAMILIA | Ready |
| productLineId | LINEA | Ready |
| format | PRESENTACION | Ready |
| brand | MARCA | Ready |
| weightKg | PESO | Ready |
| isActive | — | **Gap**: no active flag. Derive from presence in active assignments |

**Extra columns available**: CLASE, LINEA_AGRUPADORA, CATEGORIA2, LANZ36, LANZ1, ANTIGUEDAD, UPC, ALIAS

**Assessment**: Perfect fit. Every property maps to a column. isActive will be managed via ontology action (same pattern as Store).

---

### 3. ProductLine

**Derived object** — no dedicated dataset. Transform: `SELECT DISTINCT LINEA FROM IND_MERMAS_AUTOS_CAT_SKU`

| Ontology Property | Source | Status |
|-------------------|--------|--------|
| lineId | LINEA | Ready |
| lineName | LINEA | Ready (same value) |
| pushReductionFactor | Hardcoded | Q-FRESCOS = 0.33, all others = 1.0 |

---

### 4. DistributionCenter

**Derived object** — Transform: `SELECT DISTINCT CEDI FROM IND_MERMAS_AUTOS_CAT_TIENDA`

| Ontology Property | Source | Status |
|-------------------|--------|--------|
| cediCode | CEDI | Ready |
| cediName | CEDI | Ready (same value initially) |

---

### 5. RetailChain

**Derived object** — Transform: `SELECT DISTINCT CADENA FROM IND_MERMAS_AUTOS_CAT_TIENDA`

| Ontology Property | Source | Status |
|-------------------|--------|--------|
| chainId | CADENA | Ready |
| chainName | CADENA | Ready |
| alertFormat | Hardcoded | Soriana = simplified, others = full |
| executionModel | Hardcoded | Walmart = institutional, Soriana = promoter, etc. |

---

### 6. StoreProductAssignment

**Backing**: `IND_MERMAS_AUTOS_CAT_ACTIVO_TIENDA` — `ri.foundry.main.dataset.0051bb71-290d-40a4-a3cf-6928a8dd8e5b` (10,000 rows)

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| assignmentId | SAP + SKU (synthetic) | Ready |
| sapCode | SAP | Ready |
| sku | SKU | Ready |
| operacion | OPERACION | Ready |

**Enrichment sources** (join on SAP + SKU):

| Source Dataset | Adds | Rows |
|---------------|------|------|
| `IND_MERMAS_AUTOS_TIPO_MERMA_ANUAL` (6c94fd4e) | TIPO_MERMA_ANUAL, TIPO_MERMA_TRIMESTRAL, LAST_MERMA_PER | 10,000 |
| `IND_MERMAS_AUTOS_TC_INVENTARIO_OPTIMO` (075283e6) | INV_TEORICO, VENTA_PROMEDIO, DOH, INVENTARIO_OPTIMO, PEDIDO_MAXIMO, TIPO_MERMA + more | 0 (awaiting) |
| `IND_MERMAS_AUTOS_CABECERAS` (1eec3b41) | SCAN_PROM, OBJETIVO_OH, TIPO_MERMA_ANT + more | 0 (awaiting) |

**Assessment**: Core assignment data exists (10K rows). The richest enrichment source (`TC_INVENTARIO_OPTIMO` with 28 cols) is the pipeline's computed output — it would be the ideal backing dataset for the "metrics" section of StoreProductAssignment. Awaiting data.

---

### 7. SellOut

**Backing**: `IND_MERMAS_AUTOS_CABECERAS_OH_SCAN` — `ri.foundry.main.dataset.cf075434-ebce-470d-864f-b7dc9fc35f80` (10,000 rows)

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| sellOutId | SAP + SKU + FECHA (synthetic) | Ready |
| sapCode | SAP | Ready |
| sku | SKU | Ready |
| date | FECHA | Ready (timestamp → date) |
| onHandKilos | OH_KILOS | Ready |
| onHandPieces | Computed | OH_KILOS / Product.PESO |
| weeklyAvgSalesPieces | — | **From** `IND_VENTA_SCAN_SEMANAL_PROM` (SCAN_PIZAS) — 0 rows |

**Alternative/complementary sources**:
- `IND_SELL_OUT_OH_DIARIOS_28` (10394d10) — same schema (FECHA, SAP, SKU, OH_KILOS, SCAN_KILOS), 0 rows. Likely the 28-day rolling window version.
- `IND_SELL_IN_SELL_OUT28` (75f24ec2) — richer (adds ENTREGAS_KILOS, POR_MERMA_RECIENTE, INSIGNIA_TOP_VENTA), 0 rows.

**Flag**: Current 10K rows might be a sync row limit, not the full dataset. When `IND_SELL_OUT_OH_DIARIOS_28` is populated, it should be the primary source.

---

### 8. SellIn

**Backing**: `TBL_RM_CTX` — `ri.foundry.main.dataset.c02a0e1d-9eed-47f6-a92e-ce50e5ea8cb6` (backfilling, 664M rows)
**Also**: `SHARING_SELLIN` — `ri.foundry.main.dataset.ba8438c0-5413-4d87-a0a8-82838990fb61` (backfilling)

These are SAP billing documents — Sigma's sell-in to retailers at the BILL_NUM + BILL_ITEM grain.

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| sellInId | BILL_NUM + BILL_ITEM (synthetic) | Ready |
| sapCode | CUSTOMER_ID | Ready (maps to store SAP) |
| sku | MATERIAL_ID | Ready |
| date | YEAR_WEEK / YEAR_MONTH | Ready |
| orderedPieces | BILL_QTY | Ready |
| volumeDelivered | VOLUME_DELIVERED | Ready |
| netSales | NET_SALES | Ready |
| chainId | CUSTOMER_GROUP | Ready (maps to chain) |
| inTransitPieces | — | **Gap**: transit data is in T19 (Shipment object below) |
| deliveryDate | — | **Gap**: same — comes from Shipment |

**TBL_RM_CTX extras** (not in SHARING_SELLIN): REGION, BRAND, PRESENTATION, PRODUCT_DESC, MONTH_NAME, WEEK

**Assessment**: Rich sell-in data. The ontology SellIn definition was designed around a simpler schema — **may need revision to leverage the full billing document structure**. Need to clarify with Sigma the exact difference between TBL_RM_CTX and SHARING_SELLIN.

**Additional IND sell-in sources** (all 0 rows, for reference):
- `IND_SELL_IN_AS_DIARIO` — FECHA, SAP, SKU, VOL_BRUTO, DBE (daily sell-in, autoservices)
- `IND_SELL_IN_SELL_OUT28` — FECHA, SAP, SKU, OH_KILOS, SCAN_KILOS, ENTREGAS_KILOS, POR_MERMA_RECIENTE (combined 28-day)

---

### 9. Promotion

**Backing**: `IND_MERMAS_AUTOS_CABECERAS` — `ri.foundry.main.dataset.1eec3b41-7e0a-4ddd-bd01-9d9ee2481d56` (0 rows)

This dataset carries promotional context per store-SKU (INICIO_VIGENCIA, FIN_VIGENCIA, NOMBRE_CABECERA = promotion header name). However, the dedicated promotion dataset would be inferred from the promotion-specific columns.

**Alternative**: Promotions might be better sourced from a combination of:
- INICIO_VIGENCIA / FIN_VIGENCIA / NOMBRE_CABECERA in `IND_MERMAS_AUTOS_CABECERAS`
- `IND_ACTIVIDAD_TRADE` for trade promotions specifically

**Assessment**: **Ambiguous.** The ontology Promotion object has DESCRIPCION, PRECIO_SUGERIDO which map better to the SOP source. The IND sources carry promotional windows but not all Promotion properties. Needs clarification with Sigma on which IND dataset will carry promotion master data.

---

### 10. PromotionalGrid

**Backing**: `IND_PARRRILLAS` — `ri.foundry.main.dataset.e7576b20-ea63-4392-af44-8751a8fec9c1` (0 rows)

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| gridId | SAP + SKU + PARRILLA (synthetic) | Ready |
| sapCode | SAP | Ready |
| sku | SKU | Ready |
| gridName | PARRILLA | Ready |
| startDate | INICIO_VIGENCIA | Ready |
| endDate | FIN_VIGENCIA | Ready |

**Assessment**: Perfect schema match. Awaiting data.

---

### 11. TradeActivity

**Backing**: `IND_ACTIVIDAD_TRADE` — `ri.foundry.main.dataset.a58d0b6e-55d3-4aaa-addc-49a4a9337c31` (673 rows)

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| tradeActivityId | SAP + SKU + INICIO_VIGENCIA (synthetic) | Ready |
| sapCode | SAP | Ready |
| sku | SKU | Ready |
| productName | PRODUCTO | Ready |
| tradeDescription | DESC_TRADE | Ready |
| startDate | INICIO_VIGENCIA | Ready |
| endDate | FIN_VIGENCIA | Ready |

**Assessment**: Perfect match. Has data.

---

### 12. PendingNote

**Backing**: `IND_NOTAS_PENDIENTES` — `ri.foundry.main.dataset.d853ea67-9d3c-4e7b-92e1-eb9cc42c45fa` (0 rows)

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| noteId | FOLIO (or synthetic) | Ready |
| chainName | CADENA | Ready |
| sapCode | SUBSIDIARIA (= SAP?) | **Ambiguity**: column is SUBSIDIARIA not SAP |
| storeName | NOMBRETIENDA | Ready |
| amount | IMPORTE | Ready |
| date | FECHA | Ready |
| status | ESTATUS | Ready |
| year | ANO | Ready |
| month | MES | Ready |

**Extra columns**: SUCURSAL, RUTA, EJECUTIVO, ROC, GERENTE_ZONA, GERENTE_REGIONAL, KAM, FECHA_INFORMACION

**Assessment**: Good match. One ambiguity: SUBSIDIARIA vs SAP naming. Awaiting data.

---

### 13. Shipment / In-Transit (NEW — to be added to ontology)

**Backing**: T19 `transitos.csv` — **NOT in Snowflake or Foundry yet**

This is a file-based input from SAP containing in-transit shipments. Sigma has shared a sample dataset. Schema from the legacy notebook (`01_RL_TC_con_transitos.ipynb`):

| Suggested Property | Source Column | Notes |
|-------------------|--------------|-------|
| shipmentId | Solicitante + Material + Fecha entrega (synthetic) | Unique per store-SKU-delivery |
| sapCode | Solicitante | Store SAP code (maps to Store) |
| sku | Material | Product SKU (maps to Product) |
| deliveryDate | Fecha entrega | Expected delivery date (format: dd/mm/yyyy) |
| quantity | Cantidad | Pieces in transit |

**How it's used in the pipeline**:
```python
# Filter to future deliveries only
df_transitos = df_transitos[df_transitos['Fecha entrega'] >= today]
# Aggregate by store-SKU
transit_sums = df_transitos.groupby(['Solicitante', 'Material'])['Cantidad'].sum()
# Add to projected inventory
OH_proyectado = OH_Piezas + Piezas_transito
```

**Assessment**: Critical for the ordering pipeline — without transit data, projected inventory is understated (OH_proyectado = OH_Piezas only, ignoring what's already on the way). Currently a **known data gap** (T19 in TABLE_INVENTORY marked as "Not in any known source").

**Action**: Need Sigma to make transit data available in Snowflake/Foundry. Once available, create an `IND_*` sync for it and define the Shipment object type YAML.

---

## Summary of Data Readiness

### Has data now (can start building)
- **StoreProductAssignment** ← `IND_MERMAS_AUTOS_CAT_ACTIVO_TIENDA` (10K)
- **SellOut** ← `IND_MERMAS_AUTOS_CABECERAS_OH_SCAN` (10K — possibly capped)
- **TradeActivity** ← `IND_ACTIVIDAD_TRADE` (673)
- **SellIn** ← `TBL_RM_CTX` / `SHARING_SELLIN` (backfilling)

### Schema ready, awaiting data from Sigma
- **Store** ← `IND_MERMAS_AUTOS_CAT_TIENDA` (perfect 41-col schema)
- **Product** ← `IND_MERMAS_AUTOS_CAT_SKU` (perfect 15-col schema)
- **ProductLine** ← derived from Product
- **DistributionCenter** ← derived from Store
- **RetailChain** ← derived from Store
- **PromotionalGrid** ← `IND_PARRRILLAS`
- **PendingNote** ← `IND_NOTAS_PENDIENTES`

### Needs clarification
- **SellIn** — IND sources have different schema than ontology expects (volume-based vs piece-based). Ontology may need revision.
- **Promotion** — no clear IND-only source for all properties (DESCRIPCION, PRECIO_SUGERIDO). May come from `IND_MERMAS_AUTOS_CABECERAS` promotion columns.

---

---

## Computed Objects (Pipeline Output)

### Key Reference: `IND_AJUSTES_PEDIDO` (SCHEMA REFERENCE ONLY — NOT A DATA SOURCE)

`ri.foundry.main.dataset.2787a469-eafb-41a6-a088-24f1eafff4bc` — **0 rows, 43 columns**

This is the legacy pipeline output (`base.csv` from NB01). **We will NOT import this** — we will rebuild this computation in Foundry from scratch using our own transforms. This dataset serves only as a **schema reference** for what our pipeline should produce.

```
FECHA_INVENTARIO, SAP, TIENDA, GRUPO, CADENA, CEDI, REGION,
SKU, PRODUCTO, FAMILIA, LINEA, PRESENTACION, MARCA, PESO,
OH_KILOS, OH_PIEZAS, ACTIVA_CLIENTE, PUEDE_PEDIR_OP,
VOL_PROMEDIO, MERMA_PROMEDIO, TIPO_MERMA, TIPO_DE_PRECIO,
INVENTARIO_SUGERIDO, SCAN_PROM, PEDIDO_PROM,
REACTIVAR_CON_PEDIDO_OPERACION, REACTIVAR_CON_PEDIDO_CENTRAL,
TOP_VENTA, INICIO_VIGENCIA_CABECRA, FIN_VIGENCIA_CABECERA,
OBJETIVO_CABECERA, CON_CABECERA_ACTIVA, CON_PARRILLA_ACTIVA,
INICIO_VIGENCIA_PARRILLA, FIN_VIGENCIA_PARILLA, PROMO_PARRILLA,
PIEZAS_TRANSITO, OH_PROYECTADO, PIEZAS_EMPUJE,
NO_CARGAR_PEDIDO, PRIORIDAD, EMPUJE_CABECERA, PEDIDO_A_CARGAR
```

### Supporting Pipeline Datasets

| Dataset | RID | Rows | Schema | Role |
|---------|-----|------|--------|------|
| IND_MERMAS_AUTOS_TEST_PEDIDO_SUGERIDO | `f1d22f78` | 0 | SAP, SKU, VOL_BRUTO/NETO, DBE, DME, PESO, POR_MERMA, TIPO_MERMA, SCAN_PROM, PEDIDO_PROM, INVENTARIO_SUGERIDO (15 cols) | Shrinkage classification + suggested inventory |
| IND_MERMAS_AUTOS_TC_INVENTARIO_OPTIMO | `075283e6` | 0 | COMBINACION, SKU, CLASE, PRODUCTO..., INVENTARIO_OPTIMO, PEDIDO_MAXIMO, NIVELACION_RESURTIDO, RECORTE_RESURTIDO (28 cols) | Optimal inventory per store-SKU with all dimensions |
| IND_MERMAS_AUTOS_PEDIDO_EXCEL | `8bae2232` | 0 | SAP, SKU, TIPO_MERMA, PROM_SCAN, INV_SUGERIDO, VOL_BRUTO/NETO, DBE, DME, INVENTARIO_TEORICO (20 cols) | Excel-based order output |
| IND_MERMAS_MES_CALCULO | `c08fdeea` | **has data** | SAP, SKU, MES, VOLUMEN, VENTA, DMEK, DMEP, CM, DBE_VOL, VOL_BRUTO, INSIGNIA, BOTTOM (12 cols) | Monthly sales/margin calculation |
| IND_SKU_INSIGNIA | `af640015` | 0 | SAP, SKU, TIPO_MERMA_ANUAL/TRIMESTRAL, LAST_MERMA_PER, TOP_VENTA, MENOR_3 (7 cols) | Flagship flags + shrinkage |

---

### 14. OrderRecommendation

**Backing**: **Foundry-built transform** (our pipeline, not an IND import)

We rebuild the legacy pipeline computation in Foundry. The output schema mirrors `IND_AJUSTES_PEDIDO` (43 cols) as a reference.

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| recommendationId | SAP + SKU (synthetic) | Ready |
| sapCode | SAP | Ready |
| sku | SKU | Ready |
| computeDate | FECHA_INVENTARIO | Ready |
| projectedOnHand | OH_PROYECTADO | Ready |
| targetInventory | INVENTARIO_SUGERIDO | Ready |
| inventoryGap | INVENTARIO_SUGERIDO - OH_PROYECTADO | Computed |
| customerOrderPieces | PEDIDO_PROM | Ready (avg order) |
| classificationType | Derived from PIEZAS_EMPUJE + NO_CARGAR_PEDIDO | Computed |
| pushQuantity | PIEZAS_EMPUJE | Ready |
| cutFlag | NO_CARGAR_PEDIDO | Ready |
| recommendedForecastLevel | Derived from INVENTARIO_SUGERIDO | Computed |
| promotionPushQuantity | EMPUJE_CABECERA | Ready |
| priority | PRIORIDAD | Ready |
| status | — | Managed by ontology actions (initialized as pending) |
| decidedBy, decidedAt, overrideQuantity, decisionNotes | — | Managed by ontology actions |

**Assessment**: All pipeline-computed properties will be produced by our Foundry transforms. Inputs to the pipeline come from: `IND_MERMAS_AUTOS_CABECERAS_OH_SCAN` (sell-out), `IND_MERMAS_AUTOS_TIPO_MERMA_ANUAL` (shrinkage), `IND_MERMAS_AUTOS_CAT_ACTIVO_TIENDA` (assignments), Shipment data (transit), and Promotion data. Lifecycle/decision properties are managed by ontology actions.

**Schema reference**: `IND_AJUSTES_PEDIDO` (43 cols) documents what the legacy pipeline produced. Use as a validation target for our transforms.

**Supporting input datasets for the pipeline**:
- `IND_MERMAS_AUTOS_TEST_PEDIDO_SUGERIDO` (f1d22f78) — TIPO_MERMA, INVENTARIO_SUGERIDO, VOL_BRUTO/NETO, DBE, DME
- `IND_MERMAS_AUTOS_TC_INVENTARIO_OPTIMO` (075283e6) — optimal inventory with all dimensions
- `IND_MERMAS_MES_CALCULO` (c08fdeea, **has data**) — monthly sales/margin for trending

---

### 15. RecommendationHistory

**No raw backing dataset** — this is generated BY the Foundry pipeline.

Each time the pipeline runs and overwrites OrderRecommendation, the previous state is snapshotted to RecommendationHistory. This is an **append-only dataset created in Foundry** via a transform:

```
1. Read current OrderRecommendation (before pipeline overwrites it)
2. Append to RecommendationHistory with computeDate + decision snapshot
3. Pipeline overwrites OrderRecommendation with new values
```

**Assessment**: No IND dataset needed. Will be a Foundry-native transform output. Schema mirrors OrderRecommendation properties + finalStatus, decidedBy, decidedAt.

---

### 16. InventoryAlert

**No direct raw backing** — aggregated from OrderRecommendation at the store level.

Transform logic:
```
1. Group OrderRecommendation by SAP (store)
2. Count push SKUs, cut SKUs, sum pushQuantity
3. Derive severity from gap count and priority distribution
4. One alert row per store per pipeline run
```

**Enrichment for distribution**: `IND_DIRECTORIO_WHATSAPP` (4ea4a5be, 73 rows) provides recipientPhone.

**Assessment**: Pipeline-generated. No IND dataset, will be a Foundry transform.

---

### Updated: StoreProductAssignment (enrichment from pipeline datasets)

The core assignment data comes from `IND_MERMAS_AUTOS_CAT_ACTIVO_TIENDA` (10K rows), but the **metrics section** of the ontology maps directly to `IND_AJUSTES_PEDIDO`:

| Ontology Property | Source from IND_AJUSTES_PEDIDO | Status |
|-------------------|-------------------------------|--------|
| projectedOnHand | OH_PROYECTADO | Ready |
| targetInventory | INVENTARIO_SUGERIDO | Ready |
| pushQuantity | PIEZAS_EMPUJE | Ready |
| cutFlag | NO_CARGAR_PEDIDO | Ready |
| wasteClassification | TIPO_MERMA | Ready |
| weeklyAvgSalesPieces | SCAN_PROM | Ready |
| priority | PRIORIDAD | Ready |
| isFlagship | TOP_VENTA | Ready |
| promotionTargetPieces | EMPUJE_CABECERA | Ready |

**Note**: There's significant overlap between StoreProductAssignment metrics and OrderRecommendation properties — both will be produced by our Foundry pipeline transforms. This is by design: StoreProductAssignment carries the "latest" metrics, while OrderRecommendation adds lifecycle/decision tracking. `IND_AJUSTES_PEDIDO` (43 cols) serves as schema reference for what our pipeline should output.

---

### Updated: Promotion

**Backing**: `IND_MERMAS_AUTOS_CABECERAS` — `ri.foundry.main.dataset.1eec3b41-7e0a-4ddd-bd01-9d9ee2481d56` (0 rows, 17 cols)

| Ontology Property | Source Column | Status |
|-------------------|--------------|--------|
| promotionId | SAP + SKU (synthetic) | Ready |
| sapCode | SAP | Ready |
| sku | SKU | Ready |
| startDate | INICIO_VIGENCIA | Ready |
| endDate | FIN_VIGENCIA | Ready |
| targetOnHand | OBJETIVO_OH | Ready |
| isActive | Derived from date range | Computed |

**Extra columns**: SCAN_PROM, OBJETIVO_PZAS_ADICIONAL, VOL_PROM_ANT, MERMA_PROM_ANT, TIPO_MERMA_ANT, PESO, PROODUCTO, FAMILIA, LINEA, MARCA, CADENA, NOMBRE_CABECERA

**Note**: NOMBRE_CABECERA = promotion header name (maps to Promotion description). OBJETIVO_PZAS_ADICIONAL = additional pieces objective. This dataset is richer than initially mapped — it covers the promotional context well.

**Also confirmed from IND_AJUSTES_PEDIDO**: CON_CABECERA_ACTIVA, OBJETIVO_CABECERA, INICIO_VIGENCIA_CABECRA, FIN_VIGENCIA_CABECERA — promotion status is embedded in the pipeline output too.

---

## Action Items

### Immediate
1. **Create Shipment YAML** in `ontology/object_types/` — for in-transit data (T19)
2. **Revise SellIn ontology** to match TBL_RM_CTX / SHARING_SELLIN schema (billing docs)
3. **Validate SellOut 10K cap** — is `IND_MERMAS_AUTOS_CABECERAS_OH_SCAN` sync limited to 10K rows?

### Request to Sigma
4. **Populate IND_* datasets** — Store catalog, Product catalog, and other empty IND datasets
5. **Create transit table in Snowflake** — pull T19 (transitos) from SAP into Snowflake, then sync to Foundry as a new IND dataset
6. **Clarify TBL_RM_CTX vs SHARING_SELLIN** — what is the exact difference? Which should be primary for SellIn?

### When Sigma populates IND datasets
7. Build Store, Product, ProductLine, DistributionCenter, RetailChain transforms
8. Build PromotionalGrid, PendingNote backing

### Needs discussion with Sigma
9. **Customer Order Submission data** — The legacy pipeline reads retailer orders from MySQL (`proyeccion_detalle_pedidos`: FECHA, ID_CADENA, PIEZAS_PEDIDO, SAP, SKU, USER). This is what chains submit before SAP processing. Currently in SOP_PROYECCION_DETALLE_PEDIDOS (108K rows) but that's the legacy MySQL system. **Where will this live in the new architecture?** Needed for: comparing recommended vs actual orders, tracking what was submitted vs what was loaded to SAP.
10. **Promotion source** — which IND dataset will carry DESCRIPCION and PRECIO_SUGERIDO?
11. **PendingNote SAP column** — is SUBSIDIARIA the same as SAP code?
12. **SellIn clarification** — exact difference between TBL_RM_CTX and SHARING_SELLIN
