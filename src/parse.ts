import type { Result, ResultOk } from "@chocbite/ts-lib-result";
import { err, ok } from "@chocbite/ts-lib-result";

type CharMap = {
  n: number;
  s: string;
  b: boolean;
  l: null;
};

type TypeCharOrder = ["n", "s", "b", "l"];

type OrderedTypeString<Chars extends readonly string[]> =
  Chars extends readonly [
    infer First extends string,
    ...infer Rest extends readonly string[],
  ]
    ? First | `${First}${OrderedTypeString<Rest>}` | OrderedTypeString<Rest>
    : never;

type TypeString = OrderedTypeString<TypeCharOrder>;
type OptionalTypeString = `?${TypeString}`;
type PrimitiveSpec = TypeString | OptionalTypeString;

type ParseTypeString<S extends string> = S extends `?${infer Rest}`
  ? ParseTypeString<Rest> | undefined
  : S extends `${infer C}${infer Rest}`
    ? C extends keyof CharMap
      ? CharMap[C] | ParseTypeString<Rest>
      : never
    : never;

type Repeat<
  T,
  N extends number,
  Acc extends unknown[] = [],
> = Acc["length"] extends N ? Acc : Repeat<T, N, [...Acc, T]>;

type ResolveStringTuple<
  T extends readonly string[],
  Acc extends unknown[] = [],
> = T extends readonly [
  infer First extends string,
  ...infer Rest extends readonly string[],
]
  ? ResolveStringTuple<Rest, [...Acc, ParseTypeString<First>]>
  : Acc;

type ResolveSpec<T> = T extends string
  ? ParseTypeString<T>
  : T extends readonly ["?", infer Sub]
    ? ResolveSpec<Sub> | undefined
    : T extends readonly [0, infer Sub]
      ? ResolveSpec<Sub>[]
      : T extends readonly [infer N extends number, infer Sub]
        ? Repeat<ResolveSpec<Sub>, N>
        : T extends readonly PrimitiveSpec[]
          ? ResolveStringTuple<T>
          : T extends readonly SchemaQNSBL[]
            ? ResolveSpec<T[number]>
            : T extends object
              ? { -readonly [K in keyof T]: ResolveSpec<T[K]> }
              : never;

type InferSchema<S> = {
  -readonly [K in keyof S]: ResolveSpec<S[K]>;
};

type SchemaQNSBL =
  | PrimitiveSpec
  | readonly ["?", SchemaQNSBL]
  | readonly [number, SchemaQNSBL]
  | readonly SchemaQNSBL[]
  | { readonly [key: string]: SchemaQNSBL };

export type Parsed<F extends (...args: any[]) => Result<any, any>> =
  ReturnType<F> extends ResultOk<infer T> | infer _ ? T : never;

const char_display: Record<string, string> = {
  n: "number",
  s: "string",
  b: "boolean",
  l: "null",
};

function validate(
  value: unknown,
  spec: SchemaQNSBL,
  path: string,
): string | null {
  if (typeof spec === "string") {
    let type_spec: string = spec;
    if (type_spec.startsWith("?")) {
      if (value === undefined) return null;
      type_spec = type_spec.slice(1);
    }
    for (const char of type_spec) {
      if (char === "n" && typeof value === "number") return null;
      if (char === "s" && typeof value === "string") return null;
      if (char === "b" && typeof value === "boolean") return null;
      if (char === "l" && value === null) return null;
    }
    const expected = [...type_spec]
      .map((c) => char_display[c])
      .filter(Boolean)
      .join(" or ");
    return `Failed to parse due to member ${path} being wrong type (expected ${expected})`;
  }

  if (Array.isArray(spec)) {
    if (spec[0] === "?") {
      if (value === undefined) return null;
      return validate(value, spec[1] as SchemaQNSBL, path);
    }

    if (typeof spec[0] === "number") {
      const count = spec[0];
      const sub_spec = spec[1] as SchemaQNSBL;

      if (!Array.isArray(value)) {
        return `Failed to parse due to member ${path} being wrong type (expected array)`;
      }

      if (count === 0) {
        for (let i = 0; i < value.length; i++) {
          const error = validate(value[i], sub_spec, `${path}[${i}]`);
          if (error) return error;
        }
        return null;
      }

      if (value.length !== count) {
        return `Failed to parse due to member ${path} having wrong length (expected ${count}, got ${value.length})`;
      }
      for (let i = 0; i < count; i++) {
        const error = validate(value[i], sub_spec, `${path}[${i}]`);
        if (error) return error;
      }
      return null;
    }

    if (!spec.every((sub_spec) => typeof sub_spec === "string")) {
      for (const sub_spec of spec) {
        if (!validate(value, sub_spec as SchemaQNSBL, path)) return null;
      }
      return `Failed to parse due to member ${path} not matching any union type`;
    }

    if (!Array.isArray(value)) {
      return `Failed to parse due to member ${path} being wrong type (expected array)`;
    }
    if (value.length !== spec.length) {
      return `Failed to parse due to member ${path} having wrong length (expected ${spec.length}, got ${value.length})`;
    }
    for (let i = 0; i < spec.length; i++) {
      const error = validate(value[i], spec[i] as SchemaQNSBL, `${path}[${i}]`);
      if (error) return error;
    }
    return null;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return `Failed to parse due to member ${path} being wrong type (expected object)`;
  }
  const record = value as Record<string, unknown>;
  for (const [key, sub_spec] of Object.entries(
    spec as Record<string, SchemaQNSBL>,
  )) {
    const error = validate(record[key], sub_spec, `${path}.${key}`);
    if (error) return error;
  }
  return null;
}

/** Creates a parser function from a schema definition.
 *
 * Type chars: "n" = number, "s" = string, "b" = boolean, "l" = null. Concatenate for unions ("sbl" = string | boolean | null).
 *
 * Schema spec values:
 * - Type string: "n", "sbl", "nsb" — primitive or union of primitive values
 * - Optional spec: prefix a type string with "?", or use ["?", spec] — permits a missing or undefined value
 * - Nested object: { key: spec } — recursively validated object
 * - String tuple: ["ns", "b"] — tuple with per-position types
 * - Repeated tuple: [3, "s"] — fixed-length tuple of N elements of the same type
 * - Variable-length array: [0, "n"] — array of any length with uniform element type
 * - Schema union: ["?nsl", [5, "b"], { a: "n" }] — accepts any listed schema
 *
 * @example
 * const parse_user = make_parser({
 *   name: "s",
 *   age: "n",
 *   active: "b",
 *   role: "ns",
 *   scores: [0, "n"],
 *   address: { street: "s", zip: "n" },
 * });
 *
 * type User = Parsed<typeof parse_user>;
 * const result = parse_user(input);
 *
 * @param schema - Schema object defining the expected shape
 * @returns A parser that accepts unknown input (object or JSON string) and returns Result<T, string>*/
export function make_parser<const S extends Record<string, SchemaQNSBL>>(
  schema: S,
): (input: unknown) => Result<InferSchema<S>, string> {
  return (input: unknown): Result<InferSchema<S>, string> => {
    let obj: unknown;

    if (typeof input === "string") {
      try {
        obj = JSON.parse(input);
      } catch {
        return err("Failed to parse valid json");
      }
    } else {
      obj = input;
    }

    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      return err("Failed to parse: input is not an object");
    }

    const record = obj as Record<string, unknown>;

    for (const [key, spec] of Object.entries(schema)) {
      const error = validate(record[key], spec, key);
      if (error) return err(error);
    }

    return ok(record as InferSchema<S>);
  };
}
