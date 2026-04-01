select 
tops.sap,
tops.sku,
tops.top_tienda,
tops.Menor3
 from top_tienda_nacional tops
left join mermas_autos_cat_tienda tie
on tie.sap = tops.sap
where tie.Cedi ='Pachuca'