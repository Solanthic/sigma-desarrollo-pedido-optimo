# Ontology Follow-Ups

Tracked improvements and extensions deferred from the v1 ontology review.

## RetailChain extensions
- SAP transaction code patterns per chain (e.g., ZPCNC for Walmart)
- GRANEL support flag per chain
- WhatsApp distribution rules per chain
- Chain-specific field interaction templates

## Product.isActive — action vs pipeline
- Currently `Product.isActive` is a pipeline-fed value (no action to edit it)
- Decide: should product activation/deactivation be an ontology action (with audit trail, permissions) or purely pipeline-driven from the source catalog?
- If action-driven: create ActivateProduct / DeactivateProduct actions (rule-based, no cascade needed)

## Pipeline-driven auto-accept recommendations
- At scale (1M store-SKUs), manual approval won't scale
- Design configurable rules: e.g., auto-approve all priority-1 recs where pushQuantity < threshold
- Could be a Foundry pipeline or a scheduled automation
- BulkApproveRecommendations handles manual batch; auto-accept handles the rest

## DistributionCenter enrichment
- Add geographic location, capacity, region coverage, isActive
- Needed when pipeline scales from Pachuca to national

## InventoryAlert — retailer-specific alert subtypes
- Current model is one generic InventoryAlert
- May need specialized subtypes: ForecastAlert (Walmart), PromoterAlert (Soriana), etc.
- Or: keep one object, use retailer-specific resolution workflows via automations
