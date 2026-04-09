# Ontology Object → Backing Dataset Map

## Summary
Which Foundry datasets back each ontology object type. Objects are either backed by raw IND datasets (imported from Snowflake), Foundry-built transforms (our pipeline), or derived from other objects.

## Context
Mapped during ontology backing dataset investigation (2026-04-09). Full detail in `tasks/2026-04-09-ontology-backing-dataset-mapping/MAPPING.md`.

## Details

### Raw-backed objects (IND imports from Snowflake)

| Object | Backing Dataset | RID | Rows | Key Columns |
|--------|----------------|-----|------|-------------|
| Store | IND_MERMAS_AUTOS_CAT_TIENDA | `5555d546` | 0 (awaiting) | SAP, TIENDA, CEDI, CADENA, REGION, ZONA, GRUPO, LUNES-SABADO, ACTIVA (41 cols) |
| Product | IND_MERMAS_AUTOS_CAT_SKU | `9dbe82bc` | 0 (awaiting) | SKU, PRODUCTO, FAMILIA, LINEA, PRESENTACION, MARCA, PESO (15 cols) |
| StoreProductAssignment | IND_MERMAS_AUTOS_CAT_ACTIVO_TIENDA | `0051bb71` | 10,000 | SAP, SKU, OPERACION |
| SellOut | IND_MERMAS_AUTOS_CABECERAS_OH_SCAN | `cf075434` | 10,000 | SKU, SAP, FECHA, SCAN_KILOS, OH_KILOS |
| SellIn | TBL_RM_CTX / SHARING_SELLIN | `c02a0e1d` / `ba8438c0` | backfilling | BILL_NUM, CUSTOMER_ID, MATERIAL_ID, BILL_QTY, VOLUME_DELIVERED, etc. |
| Promotion | IND_MERMAS_AUTOS_CABECERAS | `1eec3b41` | 0 (awaiting) | SAP, SKU, OBJETIVO_OH, INICIO/FIN_VIGENCIA, NOMBRE_CABECERA (17 cols) |
| PromotionalGrid | IND_PARRRILLAS | `e7576b20` | 0 (awaiting) | SAP, SKU, PARRILLA, INICIO/FIN_VIGENCIA |
| TradeActivity | IND_ACTIVIDAD_TRADE | `a58d0b6e` | 673 | SAP, SKU, PRODUCTO, DESC_TRADE, INICIO/FIN_VIGENCIA |
| PendingNote | IND_NOTAS_PENDIENTES | `d853ea67` | 0 (awaiting) | CADENA, SUBSIDIARIA, FOLIO, IMPORTE, FECHA, ESTATUS (18 cols) |
| Shipment (NEW) | T19 transitos — **not in Foundry yet** | — | — | Solicitante(SAP), Material(SKU), Fecha entrega, Cantidad |

### Derived objects (transforms on other objects)

| Object | Derived From | Logic |
|--------|-------------|-------|
| ProductLine | Product | `SELECT DISTINCT LINEA` + hardcoded pushReductionFactor |
| DistributionCenter | Store | `SELECT DISTINCT CEDI` |
| RetailChain | Store | `SELECT DISTINCT CADENA` + hardcoded config |

### Foundry-built objects (our pipeline computes these)

| Object | Inputs | Notes |
|--------|--------|-------|
| OrderRecommendation | SellOut + StoreProductAssignment + Shipment + Promotion + shrinkage data | Full pipeline computation. Schema reference: `IND_AJUSTES_PEDIDO` (43 cols) |
| RecommendationHistory | OrderRecommendation (snapshot before overwrite) | Append-only audit trail |
| InventoryAlert | OrderRecommendation (aggregate per store) | Push/cut counts + severity |

### Enrichment joins

| Target Object | Enrichment Source | Join Key | Adds |
|---------------|------------------|----------|------|
| Store | IND_DIRECTORIO_WHATSAPP (`4ea4a5be`, 73 rows) | SAP | CEL_EJECUTIVO, CEL_COORDINADORA |
| StoreProductAssignment | IND_MERMAS_AUTOS_TIPO_MERMA_ANUAL (`6c94fd4e`, 10K rows) | SAP + SKU | TIPO_MERMA_ANUAL/TRIMESTRAL |
| StoreProductAssignment | IND_SKU_INSIGNIA (`af640015`) | SAP + SKU | TOP_VENTA (flagship flag) |

## Known Gaps

1. **Shipment/Transit**: T19 (`transitos.csv`) needs Sigma to pull from SAP → Snowflake → Foundry
2. **SellIn clarification**: Need to understand difference between TBL_RM_CTX and SHARING_SELLIN
3. **SellOut cap**: IND_MERMAS_AUTOS_CABECERAS_OH_SCAN has only 10K rows — investigate if sync is capped
4. **Empty IND datasets**: Store catalog, Product catalog, and several others await Sigma population

## Source
- [Task](../tasks/2026-04-09-ontology-backing-dataset-mapping/TASK.md)
- [Full Mapping](../tasks/2026-04-09-ontology-backing-dataset-mapping/MAPPING.md)
