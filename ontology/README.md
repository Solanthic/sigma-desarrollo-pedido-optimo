# Ontology: Pedido Optimo

This folder contains the Palantir Foundry ontology definitions for Sigma Alimentos Mexico's optimal ordering pipeline.

## Structure

```
ontology/
  object_types/    # One YAML file per object type (18 total)
  link_types/      # All relationships in links.yaml
  action_types/    # One YAML file per action type (7 total)
  OVERVIEW.md      # Human-readable summary
```

## How to read

Each YAML file follows the schema defined in `agents/ontology-batch.md`. Key fields:

- **apiName**: The programmatic identifier used in Foundry (PascalCase for objects, camelCase for properties/links/actions)
- **primaryKey**: The unique identifier property for each object
- **sourceMapping**: Traces each property back to the current SQL Server/MySQL table and column
- **lifecycle**: State machine for objects that have workflow states (OrderRecommendation, Alert)
- **tags**: Classifies objects as master-data, reference, transactional, or computed

## How to edit

1. Edit the YAML files directly
2. Run `/ontology` in Claude Code to interactively refine
3. Use the agent prompt at `agents/ontology-batch.md` for batch regeneration

## Object lifecycle classification

| Category | Changes | Examples |
|---|---|---|
| **master-data** | Rarely | Store, Product, DistributionCenter |
| **reference** | By admin/config | StoreProductAssignment (inventory policy + config) |
| **transactional** | Per event/day | InventorySnapshot, CustomerOrder, InTransitShipment |
| **computed** | By pipeline, has lifecycle | OrderRecommendation, Alert |

## Syncing to Foundry

These YAML definitions are the source of truth for ontology design. To create them in Foundry:

1. Use Palantir Ontology Manager to create each object type
2. Map backing datasets using the `sourceMapping` fields
3. Create link types per `link_types/links.yaml`
4. Create action types per `action_types/` files
5. Use branch/proposal workflow for all changes (never edit production directly)
