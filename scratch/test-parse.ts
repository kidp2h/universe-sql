import { Parser } from "node-sql-parser";
import { parse } from "pgsql-ast-parser";

const isLogEnabled =
  process.env.NEXT_PUBLIC_ENABLE_LOG === "true" ||
  process.env.ENABLE_LOG === "true";
const logger = {
  log: (...args: any[]) => {
    if (isLogEnabled) {
      console.log(...args);
    }
  },
};

const sql = `
WITH latest_orders AS (
  SELECT id, customer_id, amount, status,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) as rn
  FROM orders
)
SELECT 
  c.name,
  o.amount,
  CASE WHEN o.amount > 1000 THEN 'VIP' ELSE 'Regular' END as tier
FROM customers c
LEFT JOIN latest_orders o ON c.id = o.customer_id AND o.rn = 1
WHERE c.status = 'ACTIVE'
`;

const parser = new Parser();

try {
  const nodeSqlAst = parser.astify(sql);
  logger.log("--- NODE-SQL-PARSER AST ---");
  logger.log(JSON.stringify(nodeSqlAst, null, 2));
} catch (e) {
  console.error("node-sql-parser failed:", e);
}

try {
  const pgAst = parse(sql);
  logger.log("--- PGSQL-AST-PARSER AST ---");
  logger.log(JSON.stringify(pgAst, null, 2));
} catch (e) {
  console.error("pgsql-ast-parser failed:", e);
}
