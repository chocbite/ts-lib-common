export * from "./array";
export * from "./async";
export * from "./bit";
export * from "./debounce";
export * from "./diffing";
export * from "./equals";
export * from "./ip";
export * from "./number";
export * from "./parse";
export * from "./selection";
export * from "./throttle";

export function node_clone<T extends Node>(node: T): T {
  return node.cloneNode(true) as T;
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**Returns true if the object has no own enumerable string properties */
export function object_empty(obj: object): boolean {
  for (const key in obj) if (Object.hasOwn(obj, key)) return false;
  return true;
}
