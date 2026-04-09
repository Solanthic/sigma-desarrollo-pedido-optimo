SELECT
    CAST(nota.subsidiaria AS int) AS Sap,
    nota.fecha,
    nota.folio,
    nota.mes AS Comentario,
    nota.importe AS Importe
   
	 

FROM notas_pendientes nota
LEFT JOIN mermas_autos_cat_tienda tie
    ON tie.Sap = CAST(nota.subsidiaria AS int)
WHERE tie.Cedi = 'Pachuca'
ORDER BY
    nota.subsidiaria,
    nota.fecha;
