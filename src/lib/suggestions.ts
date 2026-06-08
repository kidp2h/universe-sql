export interface TableSchema {
  name: string;
  columns: string[];
}
export interface CteSchema {
  name: string;
  columns: string[];
}
export type AliasMap = Record<string, string>; // alias/cte_name → real table name

const TABLE_TRIGGERS = [
  "FROM",
  "JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL OUTER JOIN",
  "CROSS JOIN",
  "UPDATE",
  "INTO",
];
const COLUMN_TRIGGERS = [
  "SELECT",
  "WHERE",
  "HAVING",
  "SET",
  "RETURNING",
  "AND",
  "OR",
  "NOT",
  "ON",
  "WHEN",
  "THEN",
  "ELSE",
];
const SQL_KEYWORD_SET = new Set([
  ...TABLE_TRIGGERS,
  ...COLUMN_TRIGGERS,
  "AS",
  "BY",
  "GROUP",
  "ORDER",
  "LIMIT",
  "OFFSET",
  "DISTINCT",
  "CASE",
  "END",
  "IS",
  "IN",
  "LIKE",
  "BETWEEN",
  "EXISTS",
  "NULL",
  "ASC",
  "DESC",
  "WITH",
  "UNION",
  "INTERSECT",
  "EXCEPT",
  "ALL",
  "CROSS",
  "INNER",
  "OUTER",
  "FULL",
  "LEFT",
  "RIGHT",
  "NATURAL",
  "LATERAL",
  "WHERE",
  "SET",
  "VALUES",
  "RETURNING",
  "USING",
]);

function extractCteColumns(
  body: string,
  tables: TableSchema[] = [],
  ctes: CteSchema[] = [],
): string[] {
  const columns: string[] = [];
  const selectMatch = body.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!selectMatch) return columns;
  const selectList = selectMatch[1].trim();
  const fromBody = body.slice(body.search(/\bFROM\b/i));
  const localAliases: Record<string, string> = {};
  const aliasRe = /(?:FROM|JOIN)\s+(\w+)(?:\s+AS\s+|\s+)(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = aliasRe.exec(fromBody)) !== null) {
    localAliases[m[2].toLowerCase()] = m[1].toLowerCase();
  }
  function resolveLocalColumns(name: string): string[] {
    const lower = name.toLowerCase();
    const cte = ctes.find((c) => c.name === lower);
    if (cte) return cte.columns;
    return tables.find((t) => t.name.toLowerCase() === lower)?.columns ?? [];
  }
  // ✅ Helper: kiểm tra có phải keyword không
  const isKeyword = (word: string) => SQL_KEYWORD_SET.has(word.toUpperCase());
  const parts = selectList.split(",").map((p) => p.trim());
  for (const part of parts) {
    // alias.*
    const starMatch = part.match(/^(\w+)\.\*$/);
    if (starMatch) {
      const alias = starMatch[1].toLowerCase();
      const tableName = localAliases[alias] ?? alias;
      columns.push(...resolveLocalColumns(tableName));
      continue;
    }
    // SELECT *
    if (part === "*") {
      const fromMatch = fromBody.match(/FROM\s+(\w+)/i);
      if (fromMatch) {
        columns.push(...resolveLocalColumns(fromMatch[1]));
      }
      continue;
    }
    // expr AS alias
    const asMatch = part.match(/\bAS\s+(\w+)\s*$/i);
    if (asMatch) {
      const col = asMatch[1];
      if (!isKeyword(col)) columns.push(col); // ✅
      continue;
    }
    // bare alias (no AS)
    const bareMatch = part.match(/\w+\s+(\w+)\s*$/);
    if (bareMatch && !isKeyword(bareMatch[1])) {
      // ✅
      columns.push(bareMatch[1]);
      continue;
    }
    // bare column
    const colMatch = part.match(/(\w+)\s*$/);
    if (colMatch && !isKeyword(colMatch[1])) {
      // ✅
      columns.push(colMatch[1]);
    }
  }
  return columns;
}

export function extractCtes(
  sql: string,
  tables: TableSchema[] = [],
): CteSchema[] {
  const ctes: CteSchema[] = [];
  const withPos = sql.search(/\bWITH\b/i);
  if (withPos === -1) return ctes;
  let remaining = sql.slice(withPos + 4);
  const cteNameRe = /^\s*(\w+)\s+AS\s*\(/i;
  while (true) {
    const nameMatch = remaining.match(cteNameRe);
    if (!nameMatch) break;
    const name = nameMatch[1].toLowerCase();
    const startIdx = nameMatch[0].length;
    // Find matching closing paren
    let depth = 1;
    let i = startIdx;
    while (i < remaining.length && depth > 0) {
      if (remaining[i] === "(") depth++;
      else if (remaining[i] === ")") depth--;
      i++;
    }
    const body = remaining.slice(startIdx, i - 1);
    ctes.push({
      name,
      columns: extractCteColumns(body, tables, ctes), // ← truyền ctes đã parse để resolve chain
    });
    remaining = remaining.slice(i);
    const next = remaining.match(/^\s*(,|SELECT|INSERT|UPDATE|DELETE|;)/i);
    if (!next || next[1].toUpperCase() !== ",") break;
    remaining = remaining.slice(next[0].length);
  }
  return ctes;
}
// ─── Alias extractor ──────────────────────────────────────────────────────────
export function extractAliases(sql: string, ctes: CteSchema[] = []): AliasMap {
  const cleanSql = sql.replace(/;/g, " ");
  const aliases: AliasMap = {};
  const _cteNames = new Set(ctes.map((c) => c.name.toLowerCase()));
  const dmlRe =
    /\b(?:UPDATE|INSERT\s+INTO)\s+(\w+)(?:\s+AS\s+(\w+)|\s+(\w+))?/gi;
  let m: RegExpExecArray | null;
  while ((m = dmlRe.exec(cleanSql)) !== null) {
    const table = m[1].toLowerCase();
    const alias = (m[2] ?? m[3])?.toLowerCase();
    aliases[table] = table;
    if (alias && !SQL_KEYWORD_SET.has(alias.toUpperCase())) {
      aliases[alias] = table;
    }
  }
  // Pass 1: FROM/JOIN table AS alias or FROM/JOIN table alias
  const fromJoinRe = /(?:FROM|JOIN)\s+(\w+)(?:\s+AS\s+|\s+)(\w+)/gi;
  while ((m = fromJoinRe.exec(cleanSql)) !== null) {
    const table = m[1].toLowerCase();
    const alias = m[2].toLowerCase();
    if (!SQL_KEYWORD_SET.has(alias.toUpperCase())) {
      aliases[alias] = table;
    }
    aliases[table] = table;
  }
  // Pass 2: bare table without alias
  const bareRe =
    /(?:FROM|JOIN)\s+(\w+)\s*(?:$|WHERE|ON|GROUP|ORDER|HAVING|LIMIT|INNER|LEFT|RIGHT|CROSS|FULL|JOIN|,|\))/gi;
  while ((m = bareRe.exec(cleanSql)) !== null) {
    const table = m[1].toLowerCase();
    if (!aliases[table]) aliases[table] = table;
  }
  // Pass 3: trailing
  const trailingRe = /(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s*$/gi;
  while ((m = trailingRe.exec(cleanSql)) !== null) {
    const table = m[1].toLowerCase();
    const alias = m[2]?.toLowerCase();
    aliases[table] = table;
    if (alias && !SQL_KEYWORD_SET.has(alias.toUpperCase())) {
      aliases[alias] = table;
    }
  }
  return aliases;
}

/**
 * Extracts all table nodes from a connection tree, regardless of depth.
 *
 * Handles two structures:
 *  - App Sidebar (2-level):  connection.children = [schema, ...]  → schema.children = [table, ...]
 *  - Explorer Panel (3-level): connection.children = [db, ...]  → db.children = [schema, ...] → schema.children = [table, ...]
 *
 * A node is considered a "table" when it has a "Columns" child.
 */
function getTableNodes(connection: any): any[] {
  const tables: any[] = [];
  for (const level1 of connection?.children ?? []) {
    for (const level2 of level1?.children ?? []) {
      // level2 is a table (flat structure): has a "Columns" child
      if ((level2?.children ?? []).some((c: any) => c.name === "Columns")) {
        tables.push(level2);
      } else {
        // level2 is a schema (nested structure): go one level deeper
        for (const level3 of level2?.children ?? []) {
          if ((level3?.children ?? []).some((c: any) => c.name === "Columns")) {
            tables.push(level3);
          }
        }
      }
    }
  }
  return tables;
}
export function parseConnectionSchema(connection: any): TableSchema[] {
  return getTableNodes(connection).map((table: any) => ({
    name: table.name,
    columns: (
      table.children?.find((c: any) => c.name === "Columns")?.children ?? []
    ).map((col: any) => col.name as string),
  }));
}
export function parseConnectionCmSchema(
  connection: any,
): Record<string, string[]> {
  return getTableNodes(connection).reduce(
    (acc: Record<string, string[]>, table: any) => {
      acc[table.name] = (
        table.children?.find((c: any) => c.name === "Columns")?.children ?? []
      ).map((col: any) => col.name as string);
      return acc;
    },
    {},
  );
}
const STATEMENT_STARTERS = new Set([
  "SELECT",
  "WITH",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "REPLACE",
  "EXPLAIN",
  "GRANT",
  "REVOKE",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "DECLARE",
  "MERGE",
]);

function getNextRealWord(text: string, startIndex: number): string | null {
  let idx = startIndex;
  let inBlock = false;
  while (idx < text.length) {
    const char = text[idx];
    const nextChar = text[idx + 1];

    // Line comment
    if (!inBlock && char === "-" && nextChar === "-") {
      idx += 2;
      while (idx < text.length && text[idx] !== "\n") {
        idx++;
      }
      continue;
    }

    // Block comment
    if (char === "/" && nextChar === "*") {
      inBlock = true;
      idx += 2;
      continue;
    }
    if (inBlock && char === "*" && nextChar === "/") {
      inBlock = false;
      idx += 2;
      continue;
    }
    if (inBlock) {
      idx++;
      continue;
    }

    // Whitespace
    if (char === " " || char === "\t" || char === "\r" || char === "\n") {
      idx++;
      continue;
    }

    // Extract word
    let word = "";
    let tempIdx = idx;
    while (tempIdx < text.length) {
      const c = text[tempIdx];
      if (/^[a-zA-Z_0-9]$/.test(c)) {
        word += c;
        tempIdx++;
      } else {
        break;
      }
    }
    return word.toUpperCase();
  }
  return null;
}

export function getQueryAtCursorString(
  fullText: string,
  cursorOffset: number,
): { text: string; range: { from: number; to: number } } | null {
  if (!fullText) return null;
  const statements: { text: string; start: number; end: number }[] = [];
  let currentStart = 0;
  let inQuote: string | null = null;
  let parenDepth = 0;

  let firstWord = getNextRealWord(fullText, currentStart);
  let inWith = firstWord === "WITH";

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    // Handle quotes
    if ((char === "'" || char === '"') && fullText[i - 1] !== "\\") {
      if (!inQuote) inQuote = char;
      else if (inQuote === char) inQuote = null;
    }
    // Handle parentheses
    if (!inQuote) {
      if (char === "(") {
        parenDepth++;
      } else if (char === ")") {
        parenDepth = Math.max(0, parenDepth - 1);
      }
    }
    // Handle statement end
    if (!inQuote) {
      if (char === ";") {
        statements.push({
          text: fullText.substring(currentStart, i + 1),
          start: currentStart,
          end: i + 1,
        });
        currentStart = i + 1;
        parenDepth = 0; // reset depth on semicolon
        firstWord = getNextRealWord(fullText, currentStart);
        inWith = firstWord === "WITH";
      } else if (char === "\n") {
        if (parenDepth === 0) {
          // Check if the lines are separated by a blank line (optional spaces/tabs followed by another newline)
          let j = i + 1;
          let isBlankLine = false;
          while (j < fullText.length) {
            const nextChar = fullText[j];
            if (nextChar === "\n") {
              isBlankLine = true;
              break;
            }
            if (nextChar !== " " && nextChar !== "\t" && nextChar !== "\r") {
              break;
            }
            j++;
          }
          if (isBlankLine) {
            const nextWord = getNextRealWord(fullText, j + 1);
            if (nextWord && STATEMENT_STARTERS.has(nextWord)) {
              if (
                inWith &&
                (nextWord === "SELECT" ||
                  nextWord === "INSERT" ||
                  nextWord === "UPDATE" ||
                  nextWord === "DELETE")
              ) {
                // This is the main query of the CTE, do not split!
                inWith = false;
              } else {
                statements.push({
                  text: fullText.substring(currentStart, j + 1),
                  start: currentStart,
                  end: j + 1,
                });
                currentStart = j + 1;
                i = j; // skip the blank line characters
                parenDepth = 0;
                firstWord = getNextRealWord(fullText, currentStart);
                inWith = firstWord === "WITH";
              }
            }
          }
        }
      }
    }
  }
  if (currentStart < fullText.length) {
    statements.push({
      text: fullText.substring(currentStart),
      start: currentStart,
      end: fullText.length,
    });
  }
  let closestStatement: {
    text: string;
    start: number;
    end: number;
    trimmedStart: number;
    trimmedEnd: number;
    trimmedText: string;
  } | null = null;
  let minDistance = Infinity;
  const validStatements = statements
    .map((s) => {
      const trimmedText = s.text.trim();
      if (!trimmedText) return null;
      const relativeStart = s.text.indexOf(trimmedText);
      const trimmedStart = s.start + relativeStart;
      const trimmedEnd = trimmedStart + trimmedText.length;
      return {
        ...s,
        trimmedStart,
        trimmedEnd,
        trimmedText,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  for (const s of validStatements) {
    let distance = 0;
    if (cursorOffset < s.trimmedStart) {
      distance = s.trimmedStart - cursorOffset;
    } else if (cursorOffset > s.trimmedEnd) {
      distance = cursorOffset - s.trimmedEnd;
    } else {
      distance = 0; // Directly inside the statement
    }
    if (distance < minDistance) {
      minDistance = distance;
      closestStatement = s;
    } else if (distance === minDistance && closestStatement) {
      // Tie-breaker: if the distances are equal, prefer the statement before the cursor.
      const prevIsBefore = closestStatement.trimmedEnd <= cursorOffset;
      const newIsBefore = s.trimmedEnd <= cursorOffset;
      if (!prevIsBefore && newIsBefore) {
        closestStatement = s;
      }
    }
  }
  if (!closestStatement) return null;
  return {
    text: closestStatement.trimmedText,
    range: {
      from: closestStatement.trimmedStart,
      to: closestStatement.trimmedEnd,
    },
  };
}
