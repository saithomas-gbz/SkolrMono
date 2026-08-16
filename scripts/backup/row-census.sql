-- Recensement des tables et des lignes d'une base SkolrMono (#194).
-- Sert de contrôle d'intégrité après restauration : le même recensement lancé
-- sur la base source et sur la base restaurée doit donner les mêmes chiffres.
--
--   psql -d skolr -f scripts/backup/row-census.sql
--
-- query_to_xml permet de compter réellement les lignes de chaque table depuis
-- une seule requête ; pg_class.reltuples ne conviendrait pas (estimation, et
-- nulle tant qu'ANALYZE n'a pas tourné sur la base restaurée).
SELECT
  count(*)      AS tables,
  coalesce(sum(rows), 0) AS lignes
FROM (
  SELECT (xpath(
    '/row/c/text()',
    query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')
  ))[1]::text::bigint AS rows
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema NOT IN ('pg_catalog', 'information_schema')
) AS census;
