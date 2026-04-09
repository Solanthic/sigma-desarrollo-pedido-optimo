# Reference

Legacy code, initial research, and reference documentation. This is a **read-only archive** — we consult these artifacts but don't actively modify them.

## Contents

### `DISCOVERY.md`
The 89KB initial discovery document from March 2026. Contains system landscape, retailer-specific rules, data sources, pipeline stages, and user workflows. Baseline reference for understanding the legacy system.

### `sql/`
10 SQL query files from the legacy pipeline. These contain the business rules that must be ported to Foundry Python transforms: inventory targets, push quantities, cut flags, reactivation logic, alert detection.

### `notebooks/`
5 Python notebooks documenting the current implementation:
- `01_RL_TC_con_transitos.ipynb` — Optimal inventory calculation (core algorithm)
- `02_Compara_pedidos.ipynb` — Recommended vs actual order comparison
- `03_envia_alertas_por_mail.ipynb` — Email alert distribution
- `04_envia_alertas_por_whatsapp.ipynb` — WhatsApp alert delivery
- `05_sube_pdf_a_host.ipynb` — PDF upload to external host

### `mcp/`
Palantir MCP reference documentation:
- **PALANTIR_MCP_GUIDE.md** — High-level tool families and safe operating patterns
- **PALANTIR_MCP_QUICKSTART.md** — Prompt-oriented quick reference
