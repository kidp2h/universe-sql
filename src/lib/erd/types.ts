import type { Node, Edge } from "@xyflow/react";

export interface Column {
  name: string;
  type: string;
  isPrimary: boolean;
  isForeign: boolean;
}

export interface TableNodeData extends Record<string, unknown> {
  tableName: string;
  schema: string;
  columns: Column[];
}

export interface Relation {
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
}

export type ERDNode = Node<TableNodeData, "table">;
export type ERDEdge = Edge;
