# Data

Understanding the data landscape for Pedido Optimo. This folder answers: what data exists, where, in what shape, and what business logic transforms it.

## Contents

### `readiness/`
Data audit and readiness tracking:
- **DATA_READINESS_REPORT.md** — Full audit of all 19 source tables with status, column lists, samples
- **DATA_READINESS_ONEPAGER.md** — Executive summary: 5 ready, 6 reconstructible, 3 missing, 4 unknown
- **DATASET_MAPPING.md** — Ontology object types mapped to Snowflake tables, FK relationships, JSON unnesting
- **TABLE_INVENTORY.md** — Complete T01–T19 table catalog with source system, lineage, record counts

### `logic/`
Business computation rules:
- **COMPUTATION_GRAPH.md** — Raw vs derived tables, exact formulas, blindspots, aggregation dependencies

### `commercial-strategy/`
Symlink to the business canon in the commercial-strategy repo. Read-only reference for:
- Business requirements (`use-case/business/`)
- Technical constraints (`use-case/technical/`)
- Progress log (`progress-log.md`)
