export interface JSONBSchemaNode {
  key: string;
  name: string; // The display label
  fullPath: string[]; // e.g. ["user", "address", "zip"]
  types: string[]; // e.g. ["string", "number"]
  frequency: number; // 0 to 100 percentage of documents containing this key
  children: JSONBSchemaNode[];
}

export interface GeneratedQuerySnippets {
  extractValue: string; // data->'user'->>'email'
  extractJson: string; // data->'user'->'email'
  containment: string; // data @> '{"user": {"email": "value"}}'
  keyExists: string; // data->'user' ? 'email'
  pathExtractor: string; // data#>>'{user,email}'
}

/**
 * Parses value types recursively to build a merged schema tree from sampled JSON records.
 */
export function buildSchemaTree(
  rows: any[],
  columnName: string,
): JSONBSchemaNode {
  const totalCount = rows.length;

  // Temporary node structure for efficient tree merging
  interface TempNode {
    key: string;
    fullPath: string[];
    occurrences: number;
    typeSet: Set<string>;
    childrenMap: Map<string, TempNode>;
  }

  const rootTemp: TempNode = {
    key: "root",
    fullPath: [],
    occurrences: totalCount,
    typeSet: new Set(["object"]),
    childrenMap: new Map(),
  };

  // Helper to extract JSON from database row
  function extractJsonValue(row: any): any {
    if (!row) return null;
    // Row might be { [columnName]: {...} } or { columnName: "{...}" }
    const rawVal = row[columnName];
    if (rawVal === undefined || rawVal === null) return null;

    if (typeof rawVal === "string") {
      try {
        return JSON.parse(rawVal);
      } catch {
        return null;
      }
    }
    return rawVal;
  }

  // Recursive parsing helper
  function traverse(val: any, path: string[], tempNode: TempNode) {
    if (val === null || val === undefined) return;

    if (Array.isArray(val)) {
      // For arrays, we don't necessarily map array indices as individual keys.
      // Instead, we mark the parent type as "array" and if elements are objects,
      // we can merge their fields into the parent's children.
      for (const item of val) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          for (const key of Object.keys(item)) {
            const childPath = [...path, key];
            let childNode = tempNode.childrenMap.get(key);
            if (!childNode) {
              childNode = {
                key,
                fullPath: childPath,
                occurrences: 0,
                typeSet: new Set(),
                childrenMap: new Map(),
              };
              tempNode.childrenMap.set(key, childNode);
            }
            childNode.occurrences++;
            const t = getValType(item[key]);
            childNode.typeSet.add(t);
            traverse(item[key], childPath, childNode);
          }
        }
      }
      return;
    }

    if (typeof val === "object") {
      for (const key of Object.keys(val)) {
        const childPath = [...path, key];
        let childNode = tempNode.childrenMap.get(key);
        if (!childNode) {
          childNode = {
            key,
            fullPath: childPath,
            occurrences: 0,
            typeSet: new Set(),
            childrenMap: new Map(),
          };
          tempNode.childrenMap.set(key, childNode);
        }
        childNode.occurrences++;
        const t = getValType(val[key]);
        childNode.typeSet.add(t);
        traverse(val[key], childPath, childNode);
      }
    }
  }

  function getValType(v: any): string {
    if (v === null) return "null";
    if (Array.isArray(v)) {
      // Find unified type inside array if possible
      const itemTypes = new Set(v.map(getValType));
      const arrayItemType =
        itemTypes.size === 1 ? Array.from(itemTypes)[0] : "any";
      return `array[${arrayItemType}]`;
    }
    if (typeof v === "object") return "object";
    return typeof v; // "string", "number", "boolean"
  }

  // Parse all records
  let validRecordsCount = 0;
  for (const row of rows) {
    const jsonVal = extractJsonValue(row);
    if (jsonVal !== null) {
      validRecordsCount++;
      traverse(jsonVal, [], rootTemp);
    }
  }

  // Adjust occurrences for root based on valid records parsed
  rootTemp.occurrences = Math.max(1, validRecordsCount);

  // Convert temporary nested maps to sorted, finalized JSONBSchemaNode tree
  function finalizeNode(temp: TempNode): JSONBSchemaNode {
    const frequency = Math.round(
      (temp.occurrences / rootTemp.occurrences) * 100,
    );

    const childrenList: JSONBSchemaNode[] = [];
    for (const child of temp.childrenMap.values()) {
      childrenList.push(finalizeNode(child));
    }

    // Sort children alphabetically by key name
    childrenList.sort((a, b) => a.key.localeCompare(b.key));

    const finalTypes = Array.from(temp.typeSet);
    if (finalTypes.length === 0) finalTypes.push("unknown");

    return {
      key: temp.key,
      name: temp.key,
      fullPath: temp.fullPath,
      types: finalTypes,
      frequency: Math.min(100, frequency),
      children: childrenList,
    };
  }

  // Finalize child items of root
  const finalizedRootChildren: JSONBSchemaNode[] = [];
  for (const child of rootTemp.childrenMap.values()) {
    finalizedRootChildren.push(finalizeNode(child));
  }
  finalizedRootChildren.sort((a, b) => a.key.localeCompare(b.key));

  return {
    key: columnName,
    name: columnName,
    fullPath: [],
    types: ["object"],
    frequency: 100,
    children: finalizedRootChildren,
  };
}

/**
 * Builds standard, escaped query operators based on targeted path keys and leaf nodes.
 */
export function generateJSONBQueryPath(
  path: string[],
  primaryType: string,
  columnName: string,
): GeneratedQuerySnippets {
  if (path.length === 0) {
    return {
      extractValue: columnName,
      extractJson: columnName,
      containment: `${columnName} @> '{}'`,
      keyExists: `${columnName} ? ''`,
      pathExtractor: `${columnName}#>>'{}'`,
    };
  }

  const cleanCol = columnName.includes(" ") ? `"${columnName}"` : columnName;

  // 1. Extract Value (->>) - standard leaf string converter
  let extractValue = cleanCol;
  for (let i = 0; i < path.length; i++) {
    const isLast = i === path.length - 1;
    const operator = isLast ? "->>" : "->";
    extractValue += `${operator}'${path[i]}'`;
  }

  // 2. Extract JSONB (->) - returns raw JSONB structure
  let extractJson = cleanCol;
  for (const key of path) {
    extractJson += `->'${key}'`;
  }

  // 3. Key existence (?) - checks existence of targeted key inside parent
  let keyExists = cleanCol;
  if (path.length === 1) {
    keyExists += ` ? '${path[0]}'`;
  } else {
    // data->'user'->'address' ? 'zip'
    let parentPath = cleanCol;
    for (let i = 0; i < path.length - 1; i++) {
      parentPath += `->'${path[i]}'`;
    }
    keyExists = `${parentPath} ? '${path[path.length - 1]}'`;
  }

  // 4. Safe path extractor (#>>)
  const pathExtractor = `${cleanCol}#>>'{${path.join(",")}}'`;

  // 5. Containment operator (@>) - highly performant, index-safe containment mapping
  // Build nested object structure e.g. {"user": {"email": "..."}}
  function buildContainmentObj(keys: string[], type: string): any {
    if (keys.length === 0) return {};
    const [current, ...rest] = keys;

    if (rest.length === 0) {
      // Leaf node value placeholder based on parsed data type
      let val: any = "value";
      if (type.includes("number")) val = 123;
      if (type.includes("boolean")) val = true;
      if (type.includes("null")) val = null;
      if (type.includes("array")) val = [];
      return { [current]: val };
    }

    return { [current]: buildContainmentObj(rest, type) };
  }

  const containmentObj = buildContainmentObj(path, primaryType);
  const containment = `${cleanCol} @> '${JSON.stringify(containmentObj)}'`;

  return {
    extractValue,
    extractJson,
    containment,
    keyExists,
    pathExtractor,
  };
}
