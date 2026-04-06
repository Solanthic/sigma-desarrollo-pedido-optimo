# Ontology Overview: Pedido Optimo v2

Revised through dialectic review session. 15 object types, 22 links, 12 actions.

---

## Object Types

### Master Data (5)
| Object | Description | Primary Key |
|---|---|---|
| **Store** | Retail POS. Carries ordering schedule (days array), contact phones, chain/CEDI/region. Has isActive. | sapCode |
| **Product** | SKU catalog. Links to ProductLine. Has isActive (pipeline-fed). | sku |
| **DistributionCenter** | CEDI. Pipeline execution scope. Lean for v1, enriched later. | cediCode |
| **RetailChain** | Walmart, Soriana, etc. Carries alertFormat and executionModel. | chainId |
| **ProductLine** | Q-FRESCOS, etc. Carries pushReductionFactor (0.33 for fresh). | lineId |

### Core Relationship (1)
| Object | Description | Primary Key |
|---|---|---|
| **StoreProductAssignment** | Object-backed link between Store and Product. Two sections: **Config** (isActive, operationFlag, targetDaysOfSupply — editable by actions) and **Metrics** (projectedOnHand, targetInventory, pushQuantity, cutFlag, wasteClassification, priority, isFlagship — pipeline-computed). The decision dashboard. | assignmentId ({sapCode}_{sku}) |

### Data Signals (2)
| Object | Description | Primary Key |
|---|---|---|
| **SellOut** | Daily demand signal: inventory + sales at store-SKU-day level. Replaces InventorySnapshot. | sellOutId ({sapCode}_{sku}_{date}) |
| **SellIn** | Daily supply signal: orders + transit at store-SKU-day level. Replaces CustomerOrder + InTransitShipment. | sellInId ({sapCode}_{sku}_{date}) |

### Recommendations (2)
| Object | Description | Primary Key |
|---|---|---|
| **OrderRecommendation** | Live recommendation per store-SKU. Computes ALL variables for ALL retailers: push/cut quantity, forecast level, promotion push. Has lifecycle (pending→accepted→executed). | recommendationId ({sapCode}_{sku}) |
| **RecommendationHistory** | Append-only audit trail. One record per store-SKU-day. Snapshots recommendation + decision made. | historyId ({sapCode}_{sku}_{date}) |

### Alerts (1)
| Object | Description | Primary Key |
|---|---|---|
| **InventoryAlert** | Detected inventory misalignment at a store (aggregates gaps across SKUs). Resolution depends on retailer process. Has lifecycle (generated→distributed→acknowledged→resolved). | alertId ({alertDate}_{sapCode}) |

### Promotions & Context (3)
| Object | Description | Primary Key |
|---|---|---|
| **Promotion** | Promotional headers with inventory objectives. Drives promotionPushQuantity. | promotionId ({sapCode}_{sku}) |
| **PromotionalGrid** | Campaign grid membership (parrillas). Informational. | gridId |
| **TradeActivity** | Active trade events with suggested pricing. Displayed on alerts. | activityId |

### Financial (1)
| Object | Description | Primary Key |
|---|---|---|
| **PendingNote** | Credit/debit notes per store. Financial context. | noteId (folio) |

---

## Link Types (17)

```
ProductLine ←── Product ──→ (via StoreProductAssignment) ──→ Store ──→ RetailChain
                                                              │
                                                              ├──→ DistributionCenter
                                                              │
                                    SellOut ─────────────────→ Store ←── SellIn ──→ RetailChain
                                                              │
                          OrderRecommendation ───────────────→ Store
                          RecommendationHistory ─────────────→ Store
                          InventoryAlert ────────────────────→ Store
                          Promotion ─────────────────────────→ Store
```

All links are foreign-key based. StoreProductAssignment implements the object-backed link pattern (Store ←→ Product with metadata).

---

## Action Types (12)

### Recommendation Lifecycle
| Action | Type | What it does |
|---|---|---|
| **ApproveRecommendation** | rule-based | Accept a pending recommendation |
| **RejectRecommendation** | rule-based | Reject with mandatory reason |
| **OverrideOrderQuantity** | rule-based | Manually set push/cut quantity |
| **OverrideForecastLevel** | rule-based | Manually set forecast level (Walmart) |
| **BulkApproveRecommendations** | function-backed | Approve batch of recommendations |

### Alert Lifecycle
| Action | Type | What it does |
|---|---|---|
| **AcknowledgeAlert** | rule-based | Mark alert as seen |
| **ResolveAlert** | rule-based | Mark alert as resolved with notes |

### Inventory Policy
| Action | Type | What it does |
|---|---|---|
| **OverrideInventoryPolicy** | rule-based | Override targetDaysOfSupply on a store-SKU |

### Activation
| Action | Type | What it does |
|---|---|---|
| **ActivateStore** | rule-based | Reactivate a store (assignments separate) |
| **DeactivateStore** | function-backed | Deactivate store + cascade to all assignments |
| **ActivateStoreProduct** | rule-based | Enable a store-SKU assignment |
| **DeactivateStoreProduct** | rule-based | Disable a store-SKU assignment |

---

## Changes from v1

| What changed | Why |
|---|---|
| Added RetailChain, ProductLine as reference objects | Chain drives routing; line drives push reduction. Were free-text strings. |
| StoreProductAssignment gained pipeline metrics + inventory policy | Central decision dashboard. Absorbed SalesVelocity, FlagshipSku. Waste classification (Tipo_merma) renamed to wasteClassification; inventory policy concept (targetDaysOfSupply) is the actual lever, not "shrinkage." |
| SellOut/SellIn replaced InventorySnapshot, CustomerOrder, InTransitShipment | Cleaner demand/supply signal model at store-SKU-day grain. |
| OrderRecommendation redesigned | Now carries ALL variables (push, cut, forecast) for ALL retailers. One per store-SKU, always current. |
| RecommendationHistory added | Append-only audit trail for decisions. |
| Alert → InventoryAlert | Represents detected inventory gap, not generic PDF. Resolution is retailer-specific. |
| Store absorbed OrderingSchedule + ContactDirectory | One-to-one config merged as properties (orderingDays array, phone numbers). |
| Added OverrideForecastLevel, OverrideInventoryPolicy, BulkApproveRecommendations, ResolveAlert actions | Cover forecast adjustments (Walmart), policy tuning, batch operations, alert resolution. |
| Renamed EditShrinkageParameters → OverrideInventoryPolicy | Old name was confusing. It overrides days-of-supply, not shrinkage classification. |
