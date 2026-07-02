import type { Result, ResultOk } from "@chocbite/ts-lib-result";
import { err, ok } from "@chocbite/ts-lib-result";

type CharMap = {
  n: number;
  s: string;
  b: boolean;
};

type ParseTypeString<S extends string> = S extends `${infer C}${infer Rest}`
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
  : T extends readonly [0, infer TypeStr extends string]
    ? ParseTypeString<TypeStr>[]
    : T extends readonly [infer N extends number, infer TypeStr extends string]
      ? Repeat<ParseTypeString<TypeStr>, N>
      : T extends readonly string[]
        ? ResolveStringTuple<T>
        : T extends object
          ? { -readonly [K in keyof T]: ResolveSpec<T[K]> }
          : never;

type InferSchema<S> = {
  -readonly [K in keyof S]: ResolveSpec<S[K]>;
};

type SchemaSpec =
  | string
  | readonly (string | number)[]
  | { readonly [key: string]: SchemaSpec };

export type Parsed<F extends (...args: any[]) => Result<any, any>> =
  ReturnType<F> extends ResultOk<infer T> | infer _ ? T : never;

const char_display: Record<string, string> = {
  n: "number",
  s: "string",
  b: "boolean",
};

function validate(
  value: unknown,
  spec: SchemaSpec,
  path: string,
): string | null {
  if (typeof spec === "string") {
    for (const char of spec) {
      if (char === "n" && typeof value === "number") return null;
      if (char === "s" && typeof value === "string") return null;
      if (char === "b" && typeof value === "boolean") return null;
    }
    const expected = [...spec]
      .map((c) => char_display[c])
      .filter(Boolean)
      .join(" or ");
    return `Failed to parse due to member ${path} being wrong type (expected ${expected})`;
  }

  if (Array.isArray(spec)) {
    if (typeof spec[0] === "number") {
      const count = spec[0];
      const type_str = spec[1] as string;

      if (!Array.isArray(value)) {
        return `Failed to parse due to member ${path} being wrong type (expected array)`;
      }

      if (count === 0) {
        for (let i = 0; i < value.length; i++) {
          const error = validate(value[i], type_str, `${path}[${i}]`);
          if (error) return error;
        }
        return null;
      }

      if (value.length !== count) {
        return `Failed to parse due to member ${path} having wrong length (expected ${count}, got ${value.length})`;
      }
      for (let i = 0; i < count; i++) {
        const error = validate(value[i], type_str, `${path}[${i}]`);
        if (error) return error;
      }
      return null;
    }

    if (!Array.isArray(value)) {
      return `Failed to parse due to member ${path} being wrong type (expected array)`;
    }
    if (value.length !== spec.length) {
      return `Failed to parse due to member ${path} having wrong length (expected ${spec.length}, got ${value.length})`;
    }
    for (let i = 0; i < spec.length; i++) {
      const error = validate(value[i], spec[i] as string, `${path}[${i}]`);
      if (error) return error;
    }
    return null;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return `Failed to parse due to member ${path} being wrong type (expected object)`;
  }
  const record = value as Record<string, unknown>;
  for (const [key, sub_spec] of Object.entries(
    spec as Record<string, SchemaSpec>,
  )) {
    const error = validate(record[key], sub_spec, `${path}.${key}`);
    if (error) return error;
  }
  return null;
}

/** Creates a parser function from a schema definition.
 *
 * Type chars: "n" = number, "s" = string, "b" = boolean. Concatenate for unions ("sb" = string | boolean).
 *
 * Schema spec values:
 * - Type string: "n", "sb", "nsb" — primitive or union of primitives
 * - Nested object: { key: spec } — recursively validated object
 * - String tuple: ["ns", "b"] — tuple with per-position types
 * - Repeated tuple: [3, "s"] — fixed-length tuple of N elements of the same type
 * - Variable-length array: [0, "n"] — array of any length with uniform element type
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
export function make_parser<const S extends Record<string, SchemaSpec>>(
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
