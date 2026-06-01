export const postgresQueries = {
  getTablesAndColumns: `
    SELECT 
      c.table_schema as schema,
      c.table_name as "tableName",
      c.column_name as name,
      c.data_type as type,
      COALESCE(
        (SELECT true 
         FROM information_schema.key_column_usage kcu
         JOIN information_schema.table_constraints tc 
           ON kcu.constraint_name = tc.constraint_name 
           AND kcu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY' 
           AND kcu.table_schema = c.table_schema 
           AND kcu.table_name = c.table_name 
           AND kcu.column_name = c.column_name
         LIMIT 1
        ), false
      ) as "isPrimary"
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE c.table_schema NOT IN ('information_schema', 'pg_catalog') 
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_schema, c.table_name, c.ordinal_position;
  `,
  getForeignKeys: `
    SELECT
      kcu.table_schema AS "sourceSchema",
      kcu.table_name AS "sourceTable",
      kcu.column_name AS "sourceColumn",
      rel_kcu.table_schema AS "targetSchema",
      rel_kcu.table_name AS "targetTable",
      rel_kcu.column_name AS "targetColumn"
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.referential_constraints rc 
      ON kcu.constraint_name = rc.constraint_name
      AND kcu.table_schema = rc.constraint_schema
    JOIN information_schema.key_column_usage rel_kcu 
      ON rc.unique_constraint_name = rel_kcu.constraint_name
      AND rc.unique_constraint_schema = rel_kcu.table_schema
      AND kcu.position_in_unique_constraint = rel_kcu.ordinal_position
    WHERE kcu.table_schema NOT IN ('information_schema', 'pg_catalog');
  `,
};
