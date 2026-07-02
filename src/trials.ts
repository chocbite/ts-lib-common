import type { Parsed } from "./parse";
import { make_parser } from "./parse";

interface ManualSchema {
  foo: number;
  bar: string | boolean;
  baz: {
    bln: number | boolean;
    str: string;
    num: number;
  };
  field_c: [number | boolean, string];
  field_d: [string, string, string];
  field_e: string[];
}

const parser = make_parser({
  foo: "n",
  bar: "sb",
  baz: {
    bln: "nb",
    str: "s",
    num: "n",
  },
  field_c: ["nb", "s"],
  field_d: [3, "s"],
  field_e: [0, "s"],
});

const parsed = parser({ foo: 42, bar: "hello", baz: true });

type AutoSchema = Parsed<typeof parser>;

console.warn(parsed);
if (parsed.ok) {
  const parsed_ok: ManualSchema = parsed.value as AutoSchema;
  console.warn(parsed_ok);
}

const parsed2 = parser({
  foo: 42,
  bar: "hello",
  baz: { bln: true, str: "test", num: 123 },
  field_c: [false, "yes"],
  field_d: ["a", "b", "c"],
  field_e: ["x", "y"],
});

console.warn(parsed2);
if (parsed2.ok) {
  const parsed_ok: ManualSchema = parsed2.value as AutoSchema;
  console.warn(parsed_ok);
}
