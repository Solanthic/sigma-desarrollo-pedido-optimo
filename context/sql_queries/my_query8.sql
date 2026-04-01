SELECT *
FROM actividad_trade
WHERE CAST(GETDATE() AS DATE) BETWEEN Inicio_vigencia AND Fin_vigencia;
