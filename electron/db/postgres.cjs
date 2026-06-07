const { Client } = require("pg");
const { safeStorage } = require("electron");

const isLogEnabled =
  process.env.NEXT_PUBLIC_ENABLE_LOG === "true" ||
  process.env.ENABLE_LOG === "true";
const logger = {
  log: (...args) => {
    if (isLogEnabled) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (isLogEnabled) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (isLogEnabled) {
      console.warn(...args);
    }
  },
};

function decryptPassword(password) {
  if (!password) return password;
  if (password.startsWith("__safe_storage__:")) {
    if (safeStorage?.isEncryptionAvailable()) {
      try {
        const base64 = password.substring("__safe_storage__:".length);
        return safeStorage.decryptString(Buffer.from(base64, "base64"));
      } catch (err) {
        console.error(
          "[DB] Failed to decrypt password using safeStorage:",
          err,
        );
      }
    } else {
      console.warn(
        "[DB] safeStorage encryption is not available to decrypt password.",
      );
    }
  }
  return password;
}

async function withClient(payload, run) {
  const client = new Client({
    host: payload.host,
    port: Number(payload.port),
    database: payload.database,
    user: payload.username,
    password: decryptPassword(payload.password),
    ssl: payload.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    return await run(client);
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore disconnect errors.
    }
  }
}

async function testPostgresConnection(payload) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log(`\n[DB] Testing connection: "${connName}"`);
  logger.log(
    `[DB] Target Address:    ${payload.host}:${payload.port}/${payload.database} (User: ${payload.username})`,
  );
  try {
    await withClient(payload, (client) => client.query("SELECT 1"));
    logger.log(`[DB] Connection test SUCCESSFUL for "${connName}"`);
    return { ok: true };
  } catch (error) {
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.error(
      `[DB] Connection test FAILED for "${connName}". Error: ${errorMsg}`,
    );
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

async function listPostgresSchemas(payload) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log(
    `\n[DB] Listing schemas for "${connName}" (${payload.host}:${payload.port}/${payload.database})`,
  );
  try {
    const result = await withClient(payload, (client) =>
      client.query(
        `SELECT 
          s.schema_name, 
          (SELECT count(*) FROM information_schema.tables t WHERE t.table_schema = s.schema_name AND t.table_type = 'BASE TABLE') as table_count
        FROM information_schema.schemata s 
        WHERE s.schema_name NOT IN ('pg_toast') 
          AND s.schema_name NOT LIKE 'pg_temp_%' 
          AND s.schema_name NOT LIKE 'pg_toast_temp_%' 
        ORDER BY s.schema_name`,
      ),
    );

    logger.log(
      `[DB] Successfully loaded ${result.rows.length} schemas for "${connName}".`,
    );
    return {
      ok: true,
      schemas: result.rows.map((row) => ({
        name: row.schema_name,
        tableCount: Number(row.table_count || 0),
      })),
    };
  } catch (error) {
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.error(`[DB] Failed to load schemas for "${connName}": ${errorMsg}`);
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

async function listPostgresTables(payload, schema) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log(
    `\n[DB] Listing tables in schema "${schema}" for "${connName}" (${payload.host}:${payload.port}/${payload.database})`,
  );
  if (schema === "pg_catalog" || schema === "information_schema") {
    logger.log(
      `[DB] Skipping table details fetch for system schema "${schema}".`,
    );
    return { ok: true, tables: [] };
  }
  try {
    const result = await withClient(payload, (client) =>
      client.query(
        `SELECT 
          t.table_name, 
          pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) as total_bytes,
          (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as column_count,
          (SELECT count(*) FROM pg_indexes i WHERE i.schemaname = t.table_schema AND i.tablename = t.table_name) as index_count
        FROM information_schema.tables t 
        WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE' 
        ORDER BY t.table_name`,
        [schema],
      ),
    );

    logger.log(
      `[DB] Successfully loaded ${result.rows.length} tables inside schema "${schema}" for "${connName}".`,
    );
    return {
      ok: true,
      tables: result.rows.map((row) => ({
        name: row.table_name,
        size: Number(row.total_bytes || 0),
        columnCount: Number(row.column_count || 0),
        indexCount: Number(row.index_count || 0),
      })),
    };
  } catch (error) {
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.error(
      `[DB] Failed to load tables in schema "${schema}" for "${connName}": ${errorMsg}`,
    );
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

async function listPostgresColumns(payload, schema, table) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log(
    `\n[DB] Listing columns in schema "${schema}", table "${table}" for "${connName}" (${payload.host}:${payload.port}/${payload.database})`,
  );
  try {
    const [columnsResult, primaryResult, foreignResult] = await withClient(
      payload,
      async (client) => {
        const columnsPromise = client.query(
          `SELECT
            c.column_name,
            c.data_type,
            pg_catalog.col_description(
              (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass::oid,
              c.ordinal_position
            ) AS column_comment
          FROM information_schema.columns c
          WHERE c.table_schema = $1 AND c.table_name = $2
          ORDER BY c.ordinal_position`,
          [schema, table],
        );
        const primaryPromise = client.query(
          "SELECT a.attname AS column_name FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey) WHERE i.indisprimary AND n.nspname = $1 AND c.relname = $2",
          [schema, table],
        );
        const foreignPromise = client.query(
          `SELECT 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc 
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema 
          JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2`,
          [schema, table],
        );

        return Promise.all([columnsPromise, primaryPromise, foreignPromise]);
      },
    );

    const primarySet = new Set(
      primaryResult.rows.map((row) => row.column_name),
    );
    const foreignMap = new Map(
      foreignResult.rows.map((row) => [
        row.column_name,
        `${row.foreign_table_name}.${row.foreign_column_name}`,
      ]),
    );

    const columns = columnsResult.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      isPrimary: primarySet.has(row.column_name),
      isForeign: foreignMap.has(row.column_name),
      references: foreignMap.get(row.column_name),
      comment: row.column_comment || null,
    }));

    logger.log(
      `[DB] Successfully loaded ${columns.length} columns for table "${schema}.${table}" in "${connName}".`,
    );
    return { ok: true, columns };
  } catch (error) {
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.error(
      `[DB] Failed to load columns for table "${schema}.${table}" in "${connName}": ${errorMsg}`,
    );
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

async function listPostgresIndexes(payload, schema, table) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log(
    `\n[DB] Listing indexes in schema "${schema}", table "${table}" for "${connName}" (${payload.host}:${payload.port}/${payload.database})`,
  );
  try {
    const result = await withClient(payload, (client) =>
      client.query(
        "SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 ORDER BY indexname",
        [schema, table],
      ),
    );

    logger.log(
      `[DB] Successfully loaded ${result.rows.length} indexes for table "${schema}.${table}" in "${connName}".`,
    );
    return { ok: true, indexes: result.rows.map((row) => row.indexname) };
  } catch (error) {
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.error(
      `[DB] Failed to load indexes for table "${schema}.${table}" in "${connName}": ${errorMsg}`,
    );
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

async function listPostgresFullMetadata(payload) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log(
    `\n[DB] Fetching full metadata for "${connName}" (${payload.host}:${payload.port}/${payload.database})`,
  );
  const startTime = Date.now();
  try {
    const res = await withClient(payload, async (client) => {
      // 1. Fetch schemas and table counts
      const schemasResult = await client.query(
        `SELECT 
          s.schema_name, 
          (SELECT count(*) FROM information_schema.tables t WHERE t.table_schema = s.schema_name AND t.table_type = 'BASE TABLE') as table_count
        FROM information_schema.schemata s 
        WHERE s.schema_name NOT IN ('pg_toast') 
          AND s.schema_name NOT LIKE 'pg_temp_%' 
          AND s.schema_name NOT LIKE 'pg_toast_temp_%' 
        ORDER BY s.schema_name`,
      );

      const schemas = schemasResult.rows;
      const fullMetadata = [];

      for (const schemaRow of schemas) {
        const schemaName = schemaRow.schema_name;

        if (
          schemaName === "pg_catalog" ||
          schemaName === "information_schema"
        ) {
          fullMetadata.push({
            name: schemaName,
            tableCount: 0,
            tables: [],
          });
          continue;
        }

        // 2. Fetch tables for this schema
        const tablesResult = await client.query(
          `SELECT 
            t.table_name, 
            pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) as total_bytes,
            (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as column_count,
            (SELECT count(*) FROM pg_indexes i WHERE i.schemaname = t.table_schema AND i.tablename = t.table_name) as index_count
          FROM information_schema.tables t 
          WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE' 
          ORDER BY t.table_name`,
          [schemaName],
        );

        const tables = [];
        for (const tableRow of tablesResult.rows) {
          const tableName = tableRow.table_name;

          // 3. Fetch columns, primary keys, and foreign keys in batch for this table
          const columnsPromise = client.query(
            `SELECT
              c.column_name,
              c.data_type,
              pg_catalog.col_description(
                (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass::oid,
                c.ordinal_position
              ) AS column_comment
            FROM information_schema.columns c
            WHERE c.table_schema = $1 AND c.table_name = $2
            ORDER BY c.ordinal_position`,
            [schemaName, tableName],
          );
          const primaryPromise = client.query(
            "SELECT a.attname AS column_name FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey) WHERE i.indisprimary AND n.nspname = $1 AND c.relname = $2",
            [schemaName, tableName],
          );
          const foreignPromise = client.query(
            `SELECT 
              kcu.column_name, 
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema 
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2`,
            [schemaName, tableName],
          );

          // 4. Fetch indexes
          const indexesPromise = client.query(
            "SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 ORDER BY indexname",
            [schemaName, tableName],
          );

          const [colsRes, primRes, forRes, idxRes] = await Promise.all([
            columnsPromise,
            primaryPromise,
            foreignPromise,
            indexesPromise,
          ]);

          const primarySet = new Set(primRes.rows.map((r) => r.column_name));
          const foreignMap = new Map(
            forRes.rows.map((r) => [
              r.column_name,
              `${r.foreign_table_name}.${r.foreign_column_name}`,
            ]),
          );

          tables.push({
            name: tableName,
            size: Number(tableRow.total_bytes || 0),
            columnCount: Number(tableRow.column_count || 0),
            indexCount: Number(tableRow.index_count || 0),
            columns: colsRes.rows.map((row) => ({
              name: row.column_name,
              dataType: row.data_type,
              isPrimary: primarySet.has(row.column_name),
              isForeign: foreignMap.has(row.column_name),
              references: foreignMap.get(row.column_name),
              comment: row.column_comment || null,
            })),
            indexes: idxRes.rows.map((row) => row.indexname),
          });
        }

        fullMetadata.push({
          name: schemaName,
          tableCount: Number(schemaRow.table_count || 0),
          tables,
        });
      }

      return { ok: true, metadata: fullMetadata };
    });
    const duration = Date.now() - startTime;
    logger.log(
      `[DB] Successfully loaded full metadata for "${connName}" in ${duration}ms.`,
    );
    return res;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.error(
      `[DB] Failed to load full metadata for "${connName}" after ${duration}ms: ${errorMsg}`,
    );
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

function extractTablesFromSql(sql) {
  if (!sql) return [];
  const tables = new Set();

  try {
    const { Parser } = require("node-sql-parser");
    const parser = new Parser();
    const sqls = sql.split(";").filter((s) => s.trim().length > 0);
    for (const singleSql of sqls) {
      try {
        const ast = parser.astify(singleSql);
        if (ast) {
          const astList = Array.isArray(ast) ? ast : [ast];
          for (const node of astList) {
            if (node.tableList) {
              for (const tableItem of node.tableList) {
                const parts = tableItem.split("::");
                const tbl = parts[parts.length - 1];
                if (tbl) {
                  tables.add(tbl.replace(/['"`]/g, ""));
                }
              }
            } else if (node.from) {
              const fromList = Array.isArray(node.from)
                ? node.from
                : [node.from];
              for (const f of fromList) {
                if (f.table) {
                  tables.add(f.table.replace(/['"`]/g, ""));
                }
              }
            }
          }
        }
      } catch {
        // Fallback for individual queries
      }
    }
  } catch {
    // Parser require or class init failure
  }

  // Regex fallback
  try {
    const fromJoinRegex =
      /\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z0-9_".`'-]+)/gi;
    let match = fromJoinRegex.exec(sql);
    while (match !== null) {
      const fullTable = match[1];
      const parts = fullTable.split(".");
      const tbl = parts[parts.length - 1].trim();
      const cleanTbl = tbl.replace(/['"`]/g, "");
      if (
        cleanTbl &&
        !/^(?:SELECT|VALUES|WHERE|GROUP|ORDER|LIMIT|HAVING|LEFT|RIGHT|INNER|OUTER|CROSS|ON|AND|OR|NOT|AS)$/i.test(
          cleanTbl,
        )
      ) {
        tables.add(cleanTbl);
      }
      match = fromJoinRegex.exec(sql);
    }
  } catch {
    // Ignore regex errors
  }

  return Array.from(tables);
}

async function executePostgresQuery(payload, sql) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log("\n[DB] --- EXECUTING SQL QUERY ---");
  logger.log(`[DB] Connection Name: "${connName}"`);
  logger.log(
    `[DB] Target Host:    ${payload.host}:${payload.port}/${payload.database} (User: ${payload.username})`,
  );
  logger.log(`[SQL] Query Statement:\n${sql}`);

  const targetTables = extractTablesFromSql(sql);
  if (targetTables.length > 0) {
    logger.log(`[SQL] Target Table(s): ${targetTables.join(", ")}`);
  }

  if (!sql || !sql.trim()) {
    console.warn("[DB] Execution aborted: SQL query string is empty.");
    return { ok: false, message: "Query is empty" };
  }

  const startTime = Date.now();
  try {
    const result = await withClient(payload, (client) => client.query(sql));
    const duration = Date.now() - startTime;
    logger.log(
      `[DB] Query executed SUCCESSFUL inside ${duration}ms. Rows returned: ${result.rows?.length ?? 0}`,
    );
    logger.log("[DB] -----------------------------\n");
    return {
      ok: true,
      rows: result.rows ?? [],
      rowCount: typeof result.rowCount === "number" ? result.rowCount : 0,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.error(
      `[DB] Query execution FAILED after ${duration}ms. Error: ${errorMsg}`,
    );
    if (error?.detail) {
      console.error(`[DB] Error Detail: ${error.detail}`);
    }
    if (error?.hint) {
      console.error(`[DB] Error Hint:   ${error.hint}`);
    }
    logger.log("[DB] -----------------------------\n");
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

async function validatePostgresSql(payload, sql) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log(
    `\n[SQL] Validating SQL syntax on "${connName}" (${payload.host}:${payload.port}/${payload.database})`,
  );
  logger.log(`[SQL] SQL to Validate:\n${sql}`);

  if (!sql || !sql.trim()) {
    return { valid: false, message: "Query is empty" };
  }

  try {
    await withClient(payload, async (client) => {
      await client.query("SET lc_messages = 'en_US.UTF-8'");
      return client.query(`EXPLAIN ${sql}`);
    });
    logger.log("[SQL] SQL syntax validation: SUCCESSFUL");
    return { valid: true };
  } catch (error) {
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.warn(`[SQL] SQL syntax validation: INVALID. Error: ${errorMsg}`);
    if (error?.detail) {
      console.warn(`[SQL] Error Detail: ${error.detail}`);
    }
    return {
      valid: false,
      message: errorMsg,
      position: error?.position,
    };
  }
}

async function listPostgresSchemaMetadata(payload, schemaName) {
  const connName = payload.name || payload.database || "unnamed";
  logger.log(
    `\n[DB] Fetching schema metadata for "${schemaName}" on "${connName}" (${payload.host}:${payload.port}/${payload.database})`,
  );
  const startTime = Date.now();
  try {
    const res = await withClient(payload, async (client) => {
      // 1. Fetch table count
      const schemaResult = await client.query(
        `SELECT count(*) FROM information_schema.tables t WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'`,
        [schemaName],
      );
      const tableCount = Number(schemaResult.rows[0]?.count || 0);

      // 2. Fetch tables for this schema
      const tablesResult = await client.query(
        `SELECT 
          t.table_name, 
          pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) as total_bytes,
          (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as column_count,
          (SELECT count(*) FROM pg_indexes i WHERE i.schemaname = t.table_schema AND i.tablename = t.table_name) as index_count
        FROM information_schema.tables t 
        WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE' 
        ORDER BY t.table_name`,
        [schemaName],
      );

      const tables = [];
      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.table_name;

        // 3. Fetch columns, primary keys, and foreign keys in batch for this table
        const columnsPromise = client.query(
          `SELECT
            c.column_name,
            c.data_type,
            pg_catalog.col_description(
              (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass::oid,
              c.ordinal_position
            ) AS column_comment
          FROM information_schema.columns c
          WHERE c.table_schema = $1 AND c.table_name = $2
          ORDER BY c.ordinal_position`,
          [schemaName, tableName],
        );
        const primaryPromise = client.query(
          "SELECT a.attname AS column_name FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey) WHERE i.indisprimary AND n.nspname = $1 AND c.relname = $2",
          [schemaName, tableName],
        );
        const foreignPromise = client.query(
          `SELECT 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc 
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema 
          JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2`,
          [schemaName, tableName],
        );

        // 4. Fetch indexes
        const indexesPromise = client.query(
          "SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 ORDER BY indexname",
          [schemaName, tableName],
        );

        const [colsRes, primRes, forRes, idxRes] = await Promise.all([
          columnsPromise,
          primaryPromise,
          foreignPromise,
          indexesPromise,
        ]);

        const primarySet = new Set(primRes.rows.map((r) => r.column_name));
        const foreignMap = new Map(
          forRes.rows.map((r) => [
            r.column_name,
            `${r.foreign_table_name}.${r.foreign_column_name}`,
          ]),
        );

        tables.push({
          name: tableName,
          size: Number(tableRow.total_bytes || 0),
          columnCount: Number(tableRow.column_count || 0),
          indexCount: Number(tableRow.index_count || 0),
          columns: colsRes.rows.map((row) => ({
            name: row.column_name,
            dataType: row.data_type,
            isPrimary: primarySet.has(row.column_name),
            isForeign: foreignMap.has(row.column_name),
            references: foreignMap.get(row.column_name),
            comment: row.column_comment || null,
          })),
          indexes: idxRes.rows.map((row) => row.indexname),
        });
      }

      return {
        ok: true,
        schema: {
          name: schemaName,
          tableCount,
          tables,
        },
      };
    });
    const duration = Date.now() - startTime;
    logger.log(
      `[DB] Successfully loaded schema metadata for "${schemaName}" on "${connName}" in ${duration}ms.`,
    );
    return res;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg =
      error?.message ||
      (typeof error === "object" ? JSON.stringify(error) : String(error));
    console.error(
      `[DB] Failed to load schema metadata for "${schemaName}" on "${connName}" after ${duration}ms: ${errorMsg}`,
    );
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

module.exports = {
  testPostgresConnection,
  listPostgresSchemas,
  listPostgresTables,
  listPostgresColumns,
  listPostgresIndexes,
  listPostgresFullMetadata,
  listPostgresSchemaMetadata,
  executePostgresQuery,
  validatePostgresSql,
};
