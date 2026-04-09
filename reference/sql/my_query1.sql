select 
cab.Fecha AS Fecha_Invetario,
cast(cab.Sap as int) as Sap,
tie.Tienda,
tie.Grupo,
tie.cadena,
tie.Cedi,
tie.Region,
cast(cab.Sku as int) as Sku,
sku.Producto,
sku.Familia,
sku.linea,
sku.Presentacion,
sku.Marca,
sku.Peso,
cab.OH_kilos,
case 
when sku.Presentacion ='GRANEL'
THEN
ROUND(cab.OH_kilos/nullif(sku.Peso,0),2)
ELSE
ROUND(cab.OH_kilos/nullif(sku.Peso,0),0)
END
as OH_Piezas,
case 
when
act.operacion IS not null
then
1
ELSE
0
end
as
Activa_cliente,
case
when
act.operacion IS not null
then
act.operacion
else
0
end
as
Puede_pedir_op,
ped.Vol_neto as [Vol_promedio],
ped.DME as [Merma_promedio],
ped.Tipo_merma,
ped.Tipo_de_precio,
case
when
ped.Tipo_merma ='Ok' 
then
ROUND(((vta_p.Scan_pizas/nullif(7,0))*14),0)
when
ped.Tipo_merma ='Alta' 
then
ROUND(((vta_p.Scan_pizas/nullif(7,0))*12),0)
when
ped.Tipo_merma ='Muy Alta' 
then
ROUND(((vta_p.Scan_pizas/nullif(7,0))*10),0)
when
ped.Tipo_merma ='Scritica' 
then
ROUND(((vta_p.Scan_pizas/nullif(7,0))*8),0)

when
ped.Tipo_merma ='Critica' 
then
ROUND(((vta_p.Scan_pizas/nullif(7,0))*7),0)

when
ped.Tipo_merma ='Inconsistente' 
then
0
else

0

end

as Inventario_sugerido,

vta_p.Scan_pizas as Scan_prom,
ped.Pedido_prom,

case
when
ped.Tipo_merma is null and act.operacion = 1
then
1
else
0
end
as 'Reactivar_con_pedido_operacion',
case
when
ped.Tipo_merma is null and act.operacion = 0
then
1
else
0
end
as 'Reactivar_con_pedido_central',
ins.Top_venta,
cab_obj.Inicio_vigencia as Inicio_vigencia_cabecra,
cab_obj.Fin_vigencia as Fin_vigencia_cabecera,
cab_obj.Objetivo_OH as Objetivo_cabecera,
case


WHEN 

CAST(GETDATE() AS DATE) BETWEEN cab_obj.Inicio_vigencia AND cab_obj.Fin_vigencia

then
1
else
0
end
as 
Con_cabecera_activa,
case


WHEN 

CAST(GETDATE() AS DATE) BETWEEN parri.Inicio_vigencia AND parri.Fin_vigencia

then
1
else
0
end
as 
Con_parrilla_activa,
parri.Inicio_vigencia as Inicio_vigencia_parrilla,
parri.Fin_vigencia as Fin_vigencia_parilla,
parri.Parrilla as Promo_parrilla
from 
mermas_autos_cabeceras_oh_SCAN cab

left join mermas_autos_cat_tienda tie
on tie.Sap = cab.Sap
left join mermas_autos_cat_sku sku
on sku.Sku = cab.sku
left join mermas_autos_cat_activo_tienda act
on act.sap = cab.Sap and act.sku = cab.Sku
left join mermas_autos_test_pedido_sugerido ped
on ped.Sap = cab.Sap and ped.Sku = cab.Sku
left join Sku_insignia ins
on ins.sap = cab.Sap and ins.sku = cab.sku
left join mermas_autos_cabeceras cab_obj
on cab_obj.Sap  = cab.sap and cab_obj.sku = cab.sku
left join parrrillas parri
on parri.sap = cab.sap and parri.sku = cab.sku
left join Venta_scan_semanal_prom vta_p
on vta_p.sap = cab.Sap and vta_p.sku = cab.sku

WHERE fecha = DATEADD(DAY, -1, (SELECT MAX(Fecha) FROM mermas_autos_cabeceras_oh_SCAN)) and tie. Cedi ='Pachuca'
--WHERE fecha = DATEADD(DAY, -1, (SELECT MAX(Fecha) FROM mermas_autos_cabeceras_oh_SCAN)) and tie.Sap ='310963' and cab.Sku ='975'


order by
tie.Grupo,
tie.cadena,	
tie.Cedi,
tie.Region,
tie.Tienda