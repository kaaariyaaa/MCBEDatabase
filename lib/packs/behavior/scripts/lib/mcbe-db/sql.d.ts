import type { ParsedQuery, JsonValue, WhereNode } from "./types.js";
export declare function parseWhereExpression(expression: string): WhereNode;
export declare function parseSql(sql: string, params?: JsonValue[]): ParsedQuery;
