# Pedido Optimo — Resumen de Disponibilidad de Datos

**Fecha**: 2026-04-06 | **Preparado por**: Solanthic / Alfonso Garrido | **Para**: Enrique Morales, Victor Perezo

---

## Estado Actual

Se auditaron todos los datos disponibles en Foundry, Snowflake y el pipeline legacy de SQL Server. De las 19 tablas fuente que requiere el pipeline de Pedido Optimo, **5 estan listas en Snowflake**, **6 son tablas derivadas que podemos reconstruir** (tenemos el codigo), y **8 tienen brechas** — ya sea porque no estan en Snowflake o porque no tenemos la logica para reproducirlas.

| Estado | Tablas |
|---|---|
| **Listas en Snowflake** | Catalogo de tiendas, Combos activos tienda-SKU, Notas pendientes, Cabeceras ultimo dia, Ordenes de cliente |
| **Podemos reconstruir en Foundry** (codigo documentado) | Inventario sugerido, OH proyectado, Piezas empuje, Flags de recorte, Priorizacion, Empuje por cabecera |
| **Faltan en Snowflake** (datos crudos no migrados) | Sell-out/OH diario (Pavis), Catalogo SKU, Roles de pedido, Directorio WhatsApp, Transitos |
| **Falta la logica de generacion** (derivadas, codigo desconocido) | Clasificacion Tipo_merma, Velocidad semanal de venta, Modelo de inventario optimo, Rankings top-seller |

---

## Bloqueante #1: Datos Diarios de Sell-Out

Confirmamos que todo el pipeline se origina de **un dataset fundamental**: inventario diario + ventas escaneadas a nivel tienda-SKU-dia, proveniente del feed de scanners de Pavis.

**Esquema** (validado del export estatico `sell_out_oh_diarios_28`):

| Columna | Tipo | Que alimenta |
|---|---|---|
| `Fecha` | DATE | El pipeline filtra al dia mas reciente |
| `sap` | INT | Identificador de tienda |
| `Sku` | INT | Identificador de producto |
| `OH_kilos` | DOUBLE | Inventario on-hand → T01 (base de todos los calculos de pedido) |
| `Scan_kilos` | DOUBLE | Ventas escaneadas → T07 (velocidad semanal, denominador de la formula de inventario objetivo) |

**Estos datos actualmente solo estan en SQL Server.** Sin ellos en Snowflake, el pipeline de Foundry no puede ejecutarse.

---

## Dependencias de Archivos en el Pipeline Actual

El pipeline legacy depende de archivos CSV/Excel que se leen directamente desde el sistema de archivos local. Estos deben ser reemplazados por datasets de Foundry:

### Inputs criticos (datos fuente que necesitan migrar a Snowflake)

| Archivo | Leido en | Columnas clave | Origen | Estado Snowflake |
|---|---|---|---|---|
| **`transitos.csv`** | Notebook 01 (`pd.read_csv('transitos.csv', encoding='latin1')`) | `Solicitante` (→Sap), `Material` (→Sku), `Fecha entrega`, `Cantidad` | Extraccion de SAP (documentos de entrega/embarque) | **NO esta en Snowflake** — debe migrarse |
| **`sell_out_oh_diarios_28`** | No en pipeline actual pero es la fuente de T01+T07 | `Fecha`, `sap`, `Sku`, `OH_kilos`, `Scan_kilos` | Feed de scanners Pavis → SQL Server | **NO esta en Snowflake** — bloqueante #1 |

### Intermediarios Excel (black-box que se eliminan en Foundry)

| Archivo | Leido/Escrito en | Que hace | En Foundry |
|---|---|---|---|
| **`Ajustes_pedido.xlsx`** | NB01 (escribe base) → Excel COM refresh → NB02 (lee sheet 'base', skiprows=7) | Intermediario con queries live de SQL Server que se refrescan via automatizacion COM de Excel. Timeout de 30 min. | **Se elimina** — los queries SQL se replican como transforms de Foundry |
| **`Resumen_carga.xlsx`** | NB02 (escribe resumen) → Excel COM refresh → NB03/NB04 (leen sheet 'resumen_pedido', header=4) | Segundo intermediario Excel con refresh de queries. Espera hasta 30 minutos. | **Se elimina** — se reemplaza con dataset de Foundry |

### Otros archivos

| Archivo | Uso | En Foundry |
|---|---|---|
| `loguito.png` | Logo de Sigma para los PDFs de alerta | Se almacena como media en Foundry o se embebe en el template |
| `archivo.csv` | Salida: lista de distribucion WhatsApp (Telefono + URL del PDF) | Se reemplaza con action/notification de Foundry |
| `Concentrado_impulso.csv` / `Concentrado_recorte.csv` | Log acumulativo de alertas de impulso/recorte con deduplicacion | Se reemplaza con dataset historico incremental en Foundry |

---

## Nuestros Supuestos

1. `sell_out_oh_diarios_28` proviene del **feed de scanners de Pavis** que llega diariamente a SQL Server
2. La clasificacion `Tipo_merma` del pipeline usa la granularidad **trimestral** (basado en que `mermas_autos_Tipo_merma_anual` tiene columnas anual y trimestral)
3. `Scan_pizas` (velocidad semanal de ventas) se agrega sobre una **ventana movil de 28 dias**, convertido de kilos a piezas usando el peso del SKU (`Peso`)
4. `TBL_RM_CTX` y `SHARING_SELLIN` son datos de **sell-IN** (facturacion Sigma → cadena), NO sell-OUT — no alimentan la optimizacion de inventario, pero sirven para analisis de margen y volumen
5. Las tablas promocionales (`cabeceras`, `parrrillas`, `actividad_trade`) son **capturadas manualmente** por el equipo comercial, no son calculadas
6. `SOP_PAC_EMPLOYEES_COMERCIAL` en Snowflake contiene datos de contacto telefonico equivalentes a `directorio_whatsapp`
7. `SOP_PAC_PROMOCIONES` en Snowflake es la misma data que `parrrillas`

---

## Preguntas Abiertas — Se Requiere Accion

### Para Enrique Morales (antes del 2026-05-04)

| # | Pregunta | Por que importa |
|---|---|---|
| **E1** | Cuales son las reglas/umbrales exactos para la clasificacion de `Tipo_merma`? (ej. que % de merma = Ok vs Alta vs Critica?) | Esta variable controla el 100% del calculo de inventario objetivo. Sin las reglas, no podemos clasificar nuevos tienda-SKUs ni recuperarnos de datos obsoletos. |
| **E2** | Como se agrega exactamente `Scan_pizas`? Ventana movil de 28 dias? Semanas calendario? Se excluyen picos promocionales o valores atipicos? | Pequenas diferencias en la agregacion cambian todas las recomendaciones de pedido. |
| **E3** | Que es `Inventario_optimo` en la tabla TC_RL? Es un modelo mas nuevo que deberia reemplazar la formula de NB01, o un enfoque paralelo para una clase especifica de producto? | Existen dos modelos diferentes — necesitamos saber cual implementar. |
| **E4** | Como se generan `Sku_insignia` (flag top-seller) y `top_tienda_nacional` (rankings)? Que metrica, alcance y ventana de tiempo se usan? | Estos determinan que tienda-SKUs reciben prioridad en las alertas. |
| **E5** | De donde se origina la data diaria de sell-out (OH_kilos + Scan_kilos)? Pavis? Cual base de datos/tabla de SQL Server? | Necesitamos rastrear la fuente para configurar la migracion a Snowflake. |
| **E6** | Son correctos los supuestos 5-7 de arriba? | Afecta como clasificamos y migramos estas tablas. |

### Para Victor Perezo (ingenieria de datos)

| # | Accion | Prioridad |
|---|---|---|
| **V1** | Migrar los datos diarios de sell-out a Snowflake (Fecha, sap, Sku, OH_kilos, Scan_kilos — desde Pavis/SQL Server). Este es el **bloqueante #1**. | **Inmediato** |
| **V2** | Resolver la conectividad de Snowflake para syncs de tablas grandes (SHARING_SELLIN / TBL_RM_CTX). La estrategia incremental esta lista — un bloque YEAR_WEEK por ejecucion de sync. | **Inmediato** |
| **V3** | Migrar datos de **transitos** (embarques en transito) a Snowflake. Actualmente es un CSV (`transitos.csv`) extraido de SAP manualmente. Columnas: Solicitante, Material, Fecha entrega, Cantidad. Sin estos datos, el inventario proyectado se subestima. | **Este sprint** |
| **V4** | Migrar 5 tablas pequenas a Snowflake: `mermas_autos_cat_sku`, `Roles_pedido_nacional`, `directorio_whatsapp`, `mermas_autos_cabeceras`, `actividad_trade`. Todas < 10K filas. | **Este sprint** |
| **V5** | Verificar: SOP_PAC_EMPLOYEES_COMERCIAL contiene numeros de telefono (Cel_ejecutivo, Cel_coordinadora)? | **Este sprint** |
| **V6** | Verificar: SOP_PAC_PROMOCIONES tiene el mismo esquema que `parrrillas` (sap, sku, Parrilla, Inicio/Fin_vigencia)? | **Este sprint** |
| **V7** | Construir el sync de `INFORMATION_SCHEMA.COLUMNS` — existe pero nunca se ejecuto. Nos da metadatos de columnas para las 39 tablas de una vez. | **Deseable** |

---

## Lo Que Podemos Empezar a Construir Hoy

Mientras esperamos la resolucion de los bloqueantes, podemos avanzar en Foundry con:

- **Transforms de estandarizacion de tiendas/SKUs** — normalizacion de dimensiones desde las tablas ya disponibles en Snowflake
- **Logica completa de calculo de pedido sugerido** (actualmente en Notebook 01 del pipeline legacy) — incluye: conversion de kilos a piezas, inventario proyectado (OH + transitos), inventario sugerido por tipo de merma, calculo de piezas de empuje, descuento Q-FRESCOS (x0.33), flag de recorte, y priorizacion por top-seller. Todas las formulas estan documentadas y listas para implementar como transforms de Foundry
- **Pipeline de comparacion de pedidos** — las ordenes de cliente (T18) estan en Snowflake; la logica de comparacion esta documentada
- **Enriquecimiento de notas** — notas pendientes (T13) estan en Snowflake con esquema validado
- **Infraestructura de sync incremental** — configuracion lista para SHARING_SELLIN y TBL_RM_CTX una vez se resuelva la conectividad

---

*Detalle tecnico completo: `context/DATA_READINESS_REPORT.md` | Formulas: `context/COMPUTATION_GRAPH.md` | Mapeo de datasets: `context/DATASET_MAPPING.md`*
