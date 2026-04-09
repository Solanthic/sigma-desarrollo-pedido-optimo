select 
dir.* from directorio_whatsapp dir
left join mermas_autos_cat_tienda tie
on tie.sap = dir.sap
where tie.Cedi ='Pachuca'