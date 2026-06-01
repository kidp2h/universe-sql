export interface ColumnState {
  id: string;
  name: string;
  originalName: string;
  type: string;
  not_null: boolean;
  default_value: string;
  comment: string;
  is_primary: boolean;
  isNew?: boolean;
}

/**
 * Compiles a list of altered schema properties into proper PostgreSQL DDL queries.
 */
export function generateAlterTableSql(
  schema: string,
  table: string,
  columns: ColumnState[],
  originalColumns: ColumnState[],
  droppedColumns: string[],
): string {
  const fullTableNameEscaped = `"${schema}"."${table}"`;
  const statements: string[] = [];

  // 1. Process dropped columns
  for (const colName of droppedColumns) {
    statements.push(
      `ALTER TABLE ${fullTableNameEscaped} DROP COLUMN "${colName}";`,
    );
  }

  // 2. Process active columns
  for (const col of columns) {
    if (col.isNew) {
      let stmt = `ALTER TABLE ${fullTableNameEscaped} ADD COLUMN "${col.name}" ${col.type}`;
      if (col.not_null) {
        stmt += " NOT NULL";
      } else {
        stmt += " NULL";
      }
      if (col.default_value?.trim()) {
        stmt += ` DEFAULT ${col.default_value}`;
      }
      stmt += ";";
      statements.push(stmt);

      if (col.is_primary) {
        statements.push(
          `ALTER TABLE ${fullTableNameEscaped} ADD PRIMARY KEY ("${col.name}");`,
        );
      }

      if (col.comment?.trim()) {
        statements.push(
          `COMMENT ON COLUMN ${fullTableNameEscaped}."${col.name}" IS '${col.comment.replace(/'/g, "''")}';`,
        );
      }
    } else {
      const orig = originalColumns.find((o) => o.name === col.originalName);
      if (!orig) continue;

      const escapedOrigName = `"${col.originalName}"`;
      const escapedNewName = `"${col.name}"`;

      // A. Rename column
      if (col.name !== col.originalName) {
        statements.push(
          `ALTER TABLE ${fullTableNameEscaped} RENAME COLUMN ${escapedOrigName} TO ${escapedNewName};`,
        );
      }

      // B. Alter type
      if (col.type !== orig.type) {
        statements.push(
          `ALTER TABLE ${fullTableNameEscaped} ALTER COLUMN ${escapedNewName} TYPE ${col.type};`,
        );
      }

      // C. Alter nullable constraint
      if (col.not_null !== orig.not_null) {
        if (col.not_null) {
          statements.push(
            `ALTER TABLE ${fullTableNameEscaped} ALTER COLUMN ${escapedNewName} SET NOT NULL;`,
          );
        } else {
          statements.push(
            `ALTER TABLE ${fullTableNameEscaped} ALTER COLUMN ${escapedNewName} DROP NOT NULL;`,
          );
        }
      }

      // D. Alter default expression
      const origDef = (orig.default_value || "").trim();
      const newDef = (col.default_value || "").trim();
      if (newDef !== origDef) {
        if (newDef) {
          statements.push(
            `ALTER TABLE ${fullTableNameEscaped} ALTER COLUMN ${escapedNewName} SET DEFAULT ${newDef};`,
          );
        } else {
          statements.push(
            `ALTER TABLE ${fullTableNameEscaped} ALTER COLUMN ${escapedNewName} DROP DEFAULT;`,
          );
        }
      }

      // E. Alter column comment
      const origComm = (orig.comment || "").trim();
      const newComm = (col.comment || "").trim();
      if (newComm !== origComm) {
        if (newComm) {
          statements.push(
            `COMMENT ON COLUMN ${fullTableNameEscaped}.${escapedNewName} IS '${newComm.replace(/'/g, "''")}';`,
          );
        } else {
          statements.push(
            `COMMENT ON COLUMN ${fullTableNameEscaped}.${escapedNewName} IS NULL;`,
          );
        }
      }

      // F. Alter primary key constraint
      if (col.is_primary !== orig.is_primary) {
        if (col.is_primary) {
          statements.push(
            `ALTER TABLE ${fullTableNameEscaped} ADD PRIMARY KEY (${escapedNewName});`,
          );
        } else {
          const tableConstraintName = `${table.replace(/"/g, "")}_pkey`;
          statements.push(
            `ALTER TABLE ${fullTableNameEscaped} DROP CONSTRAINT IF EXISTS "${tableConstraintName}";`,
          );
        }
      }
    }
  }

  return statements.join("\n");
}
