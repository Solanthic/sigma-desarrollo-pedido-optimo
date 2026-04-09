# Pedido Optimo — Resumen de Disponibilidad de Datos

**Fecha**: 2026-04-06 | **Preparado por**: Solanthic / Alfonso Garrido | **Para**: Enrique Morales, Victor Perezo

---

## Estado Actual

Se auditaron todos los datos disponibles en Foundry, Snowflake y el pipeline legacy de SQL Server. De las 19 tablas fuente que requiere el pipeline de Pedido Optimo: **5 estan listas en Snowflake**, **6 son tablas derivadas que podemos reconstruir** (tenemos el codigo), **3 faltan en Snowflake** (datos crudos no migrados), **1 esta parcial** (solo 1 tienda), **1 tiene un match sin verificar**, **1 tiene codigo parcialmente conocido**, y **4 tienen la logica de generacion completamente desconocida**.


| Estado                                                                 | Tablas                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Listas en Snowflake** (5)                                            | Catalogo de tiendas, Combos activos tienda-SKU, Notas pendientes, Cabeceras ultimo dia, Ordenes de cliente                                                                                      |
| **Podemos reconstruir en Foundry** (codigo documentado) (6)            | Inventario sugerido, OH proyectado, Piezas empuje, Flags de recorte, Priorizacion, Empuje por cabecera, flags de reactivacion, flags de alertas, ratio de merma, exclusion Wal-Mart GRANEL       |
| **Faltan en Snowflake** (datos crudos no migrados) (3)                 | Sell-out/OH diario (Pavis), Roles de pedido, Transitos                                                                                                                                           |
| **Parcial en Snowflake** (embedded, solo 1 tienda) (1)                 | Catalogo SKU (T03) — existe en SOP_PAC_PEDIDO_BASE pero solo 185 filas. Necesita tabla standalone                                                                                                |
| **Match en Snowflake sin verificar** (1)                               | Directorio WhatsApp (T12) — posible match: SOP_PAC_EMPLOYEES_COMERCIAL (17,517 filas). Pendiente verificar esquema                                                                               |
| **Codigo parcialmente conocido** (1)                                   | Velocidad semanal de venta (T07) — formula downstream documentada, pero metodo de agregacion (ventana, conversion, outliers) desconocido                                                         |
| **Falta la logica de generacion** (derivadas, codigo desconocido) (4)  | Clasificacion Tipo_merma (T05), Modelo de inventario optimo (T16), Rankings top-seller: Sku_insignia (T08) y top_tienda_nacional (T11)                                                           |


---

## Bloqueante #1: Datos Diarios de Sell-Out

Confirmamos que todo el pipeline se origina de **un dataset fundamental**: inventario diario + ventas escaneadas a nivel tienda-SKU-dia, proveniente del feed de scanners de Pavis.

**Esquema** (validado del export estatico `sell_out_oh_diarios_28`):


| Columna      | Tipo   | Que alimenta                                                                                  |
| ------------ | ------ | --------------------------------------------------------------------------------------------- |
| `Fecha`      | DATE   | El pipeline filtra al dia mas reciente                                                        |
| `sap`        | INT    | Identificador de tienda                                                                       |
| `Sku`        | INT    | Identificador de producto                                                                     |
| `OH_kilos`   | DOUBLE | Inventario on-hand → T01 (base de todos los calculos de pedido)                               |
| `Scan_kilos` | DOUBLE | Ventas escaneadas → T07 (velocidad semanal, denominador de la formula de inventario objetivo) |


**Estos datos actualmente solo estan en SQL Server.** Sin ellos en Snowflake, el pipeline de Foundry no puede ejecutarse.

---

## Dependencias de Archivos en el Pipeline Actual

El pipeline legacy depende de archivos CSV/Excel que se leen directamente desde el sistema de archivos local. Estos deben ser reemplazados por datasets de Foundry:

### Inputs criticos (datos fuente que necesitan migrar a Snowflake)


| Archivo                      | Leido en                                                        | Columnas clave                                                       | Origen                                             | Estado Snowflake                         |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| `**transitos.csv`**          | Notebook 01 (`pd.read_csv('transitos.csv', encoding='latin1')`) | `Solicitante` (→Sap), `Material` (→Sku), `Fecha entrega`, `Cantidad` | Extraccion de SAP (documentos de entrega/embarque) | **NO esta en Snowflake** — debe migrarse |
| `**sell_out_oh_diarios_28`** | No en pipeline actual pero es la fuente de T01+T07              | `Fecha`, `sap`, `Sku`, `OH_kilos`, `Scan_kilos`                      | Feed de scanners Pavis → SQL Server                | **NO esta en Snowflake** — bloqueante #1 |


### Intermediarios Excel (black-box que se eliminan en Foundry)


| Archivo                   | Leido/Escrito en                                                                               | Que hace                                                                                                          | En Foundry                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `**Ajustes_pedido.xlsx`** | NB01 (escribe base) → Excel COM refresh → NB02 (lee sheet 'base', skiprows=7)                  | Intermediario con queries live de SQL Server que se refrescan via automatizacion COM de Excel. Timeout de 30 min. | **Se elimina** — los queries SQL se replican como transforms de Foundry |
| `**Resumen_carga.xlsx`**  | NB02 (escribe resumen) → Excel COM refresh → NB03/NB04 (leen sheet 'resumen_pedido', header=4) | Segundo intermediario Excel con refresh de queries. Espera hasta 30 minutos.                                      | **Se elimina** — se reemplaza con dataset de Foundry                    |


### Otros archivos


| Archivo                                               | Uso                                                             | En Foundry                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| `loguito.png`                                         | Logo de Sigma para los PDFs de alerta                           | Se almacena como media en Foundry o se embebe en el template |
| `archivo.csv`                                         | Salida: lista de distribucion WhatsApp (Telefono + URL del PDF) | Se reemplaza con action/notification de Foundry              |
| `Concentrado_impulso.csv` / `Concentrado_recorte.csv` | Log acumulativo de alertas de impulso/recorte con deduplicacion | Se reemplaza con dataset historico incremental en Foundry    |


---

## Nuestros Supuestos

> Los supuestos marcados **[CONFIRMADO]** fueron validados contra documentacion de discovery y notas de sesiones. Los marcados **[POR VERIFICAR]** son inferencias que requieren confirmacion explicita.

1. **[CONFIRMADO]** `sell_out_oh_diarios_28` proviene del **feed de scanners de Pavis** que llega diariamente a SQL Server *(fuente: DISCOVERY.md, sesion Python Deep Dive 2026-03-26)*
2. **[POR VERIFICAR]** La clasificacion `Tipo_merma` del pipeline usa la granularidad **trimestral** (basado en que `mermas_autos_Tipo_merma_anual` tiene columnas anual y trimestral). *Inferencia — requiere confirmacion de Enrique (ver E1)*
3. **[POR VERIFICAR]** `Scan_pizas` (velocidad semanal de ventas) se agrega sobre una **ventana movil de 28 dias**, convertido de kilos a piezas usando el peso del SKU (`Peso`). *Inferencia del nombre de tabla "28" — requiere confirmacion de Enrique (ver E2)*
4. **[CONFIRMADO]** `TBL_RM_CTX` y `SHARING_SELLIN` son datos de **sell-IN** (facturacion Sigma → cadena), NO sell-OUT — no alimentan la optimizacion de inventario, pero sirven para analisis de margen y volumen *(fuente: progress-log, correccion documentada)*
5. **[POR VERIFICAR]** Las tablas promocionales (`cabeceras`, `parrrillas`, `actividad_trade`) son **capturadas manualmente** por el equipo comercial, no son calculadas. *Ninguna sesion de discovery lo confirma explicitamente (ver E6)*
6. **[POR VERIFICAR]** `SOP_PAC_EMPLOYEES_COMERCIAL` en Snowflake contiene datos de contacto telefonico equivalentes a `directorio_whatsapp`. *Requiere comparacion de esquemas (ver V5)*
7. **[POR VERIFICAR]** `SOP_PAC_PROMOCIONES` en Snowflake es la misma data que `parrrillas`. *Requiere comparacion de esquemas (ver V6)*

---

## Preguntas Abiertas — Se Requiere Accion

### Para Enrique Morales (antes del 2026-05-04)


| #      | Pregunta                                                                                                                                                                     | Por que importa                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E1** | Cuales son las reglas/umbrales exactos para la clasificacion de `Tipo_merma`? (ej. que % de merma = Ok vs Alta vs Critica?)                                                  | Esta variable controla el 100% del calculo de inventario objetivo. Sin las reglas, no podemos clasificar nuevos tienda-SKUs ni recuperarnos de datos obsoletos. |
| **E2** | Como se agrega exactamente `Scan_pizas`? Ventana movil de 28 dias? Semanas calendario? Se excluyen picos promocionales o valores atipicos?                                   | Pequenas diferencias en la agregacion cambian todas las recomendaciones de pedido.                                                                              |
| **E3** | Que es `Inventario_optimo` en la tabla TC_RL? Es un modelo mas nuevo que deberia reemplazar la formula de NB01, o un enfoque paralelo para una clase especifica de producto? | Existen dos modelos diferentes — necesitamos saber cual implementar.                                                                                            |
| **E4** | Como se generan `Sku_insignia` (flag top-seller) y `top_tienda_nacional` (rankings)? Que metrica, alcance y ventana de tiempo se usan?                                       | Estos determinan que tienda-SKUs reciben prioridad en las alertas.                                                                                              |
| **E5** | De donde se origina la data diaria de sell-out (OH_kilos + Scan_kilos)? Pavis? Cual base de datos/tabla de SQL Server?                                                       | Necesitamos rastrear la fuente para configurar la migracion a Snowflake.                                                                                        |
| **E6** | Son correctos los supuestos 5-7 de arriba?                                                                                                                                   | Afecta como clasificamos y migramos estas tablas.                                                                                                               |


### Para Victor Perezo (ingenieria de datos)


| #      | Accion                                                                                                                                                                                                                                                    | Prioridad       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **V1** | Migrar los datos diarios de sell-out a Snowflake (Fecha, sap, Sku, OH_kilos, Scan_kilos — desde Pavis/SQL Server). Este es el **bloqueante #1**.                                                                                                          | **Inmediato**   |
| **V2** | Resolver la conectividad de Snowflake para syncs de tablas grandes (SHARING_SELLIN / TBL_RM_CTX). La estrategia incremental esta lista — un bloque YEAR_WEEK por ejecucion de sync.                                                                       | **Inmediato**   |
| **V3** | Migrar datos de **transitos** (embarques en transito) a Snowflake. Actualmente es un CSV (`transitos.csv`) extraido de SAP manualmente. Columnas: Solicitante, Material, Fecha entrega, Cantidad. Sin estos datos, el inventario proyectado se subestima. | **Este sprint** |
| **V4** | Migrar 5 tablas pequenas a Snowflake: `mermas_autos_cat_sku`, `Roles_pedido_nacional`, `directorio_whatsapp`, `mermas_autos_cabeceras`, `actividad_trade`. Todas < 10K filas.                                                                             | **Este sprint** |
| **V5** | Verificar: SOP_PAC_EMPLOYEES_COMERCIAL contiene numeros de telefono (Cel_ejecutivo, Cel_coordinadora)?                                                                                                                                                    | **Este sprint** |
| **V6** | Verificar: SOP_PAC_PROMOCIONES tiene el mismo esquema que `parrrillas` (sap, sku, Parrilla, Inicio/Fin_vigencia)?                                                                                                                                         | **Este sprint** |
| **V7** | Construir el sync de `INFORMATION_SCHEMA.COLUMNS` — existe pero nunca se ejecuto. Nos da metadatos de columnas para las 39 tablas de una vez.                                                                                                             | **Deseable**    |


---

## Lo Que Podemos Empezar a Construir Hoy

Mientras esperamos la resolucion de los bloqueantes, podemos avanzar en Foundry con:

- **Transforms de estandarizacion de tiendas/SKUs** — normalizacion de dimensiones desde las tablas ya disponibles en Snowflake
- **Logica completa de calculo de pedido sugerido** (actualmente en Notebook 01 del pipeline legacy) — incluye: conversion de kilos a piezas, inventario proyectado (OH + transitos), inventario sugerido por tipo de merma, calculo de piezas de empuje, descuento Q-FRESCOS (x0.33), flag de recorte, priorizacion por top-seller, flags de reactivacion (operacion vs central), y flags de vigencia (cabecera/parrilla activa). Todas las formulas estan documentadas y listas para implementar como transforms de Foundry
- **Logica de alertas y distribucion** — flags de alerta (impulso/recorte), calculo de ratio de merma (`-Merma_promedio / Vol_promedio × 100`), exclusion Wal-Mart GRANEL, ruteo especifico para Soriana, y acumulacion historica (Concentrado_impulso/recorte con deduplicacion). Codigo completo en NB03-05
- **Pipeline de comparacion de pedidos** — las ordenes de cliente (T18) estan en Snowflake; la logica de comparacion esta documentada
- **Enriquecimiento de notas** — notas pendientes (T13) estan en Snowflake con esquema validado
- **Infraestructura de sync incremental** — configuracion lista para SHARING_SELLIN y TBL_RM_CTX una vez se resuelva la conectividad

> **Nota sobre Tipo_merma**: El SQL fuente (`my_query1.sql`) contiene las categorias `'Scritica'` (multiplicador 8 dias) y `'Critica'` (multiplicador 7 dias) como ramas separadas. Confirmar con Enrique si ambas son clasificaciones intencionales o si `'Scritica'` es una variante historica de escritura.

---

*Detalle tecnico completo: `data/readiness/DATA_READINESS_REPORT.md` | Formulas: `data/logic/COMPUTATION_GRAPH.md` | Mapeo de datasets: `data/readiness/DATASET_MAPPING.md`*