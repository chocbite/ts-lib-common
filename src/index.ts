export * from "./array";
export * from "./async";
export * from "./bit";
export * from "./debounce";
export * from "./diffing";
export * from "./equals";
export * from "./ip";
export * from "./parse";
export * from "./selection";
export * from "./throttle";

export function node_clone<T extends Node>(node: T): T {
  return node.cloneNode(true) as T;
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
