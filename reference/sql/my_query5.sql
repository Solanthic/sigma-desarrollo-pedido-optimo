select
rol.*,
tie.Tienda,
tie.Grupo,
tie.Cadena,
tie.Region,
tie.Zona,
tie.cedi

from Roles_pedido_nacional rol
left join mermas_autos_cat_tienda tie
on tie.Sap = rol.sap