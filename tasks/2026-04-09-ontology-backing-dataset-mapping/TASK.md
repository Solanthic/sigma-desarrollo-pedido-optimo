# Ontology Backing Dataset Mapping

## Goal
For each core ontology object type, identify the best candidate raw dataset(s) in Foundry to serve as the backing data source. Compare ontology properties against actual dataset schemas, flag gaps and ambiguities.

## Value
- Unblocks ontology deployment: can't create objects in Foundry without knowing which datasets back them
- Identifies data gaps early: if a property has no source column, we know what transforms are needed
- Creates a reusable mapping reference for all future pipeline work

## Definition of Done
- [ ] Each of the 12 core objects has a recommended backing dataset (or "needs transform" flag)
- [ ] Property-to-column mapping for each object
- [ ] Gaps flagged: properties with no source column
- [ ] Ambiguities flagged: multiple candidate datasets for same object
- [ ] Results documented in this task folder

## Context
- Ontology definitions: `ontology/object_types/*.yaml`
- Existing mapping docs: `data/readiness/DATASET_MAPPING.md`, `data/readiness/TABLE_INVENTORY.md`
- Raw folder: `/Sigma Alimentos-45c2b9/Fuente de Datos - Snowflake /raw` (66 datasets)
- Knowledge: `knowledge/weekly-incremental-sync.md` (for the two large sales datasets)

## Objects to Map (12)

### Master Data
1. Store
2. Product
3. ProductLine
4. DistributionCenter
5. RetailChain

### Core Relationship
6. StoreProductAssignment

### Data Signals
7. SellOut
8. SellIn

### Promotional Context
9. Promotion
10. PromotionalGrid
11. TradeActivity

### Financial
12. PendingNote

## Status
in-progress

## Log
- 2026-04-09: Task created. 66 raw datasets inventoried from Foundry. Starting with master data objects.
