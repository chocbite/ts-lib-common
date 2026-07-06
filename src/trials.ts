import type { Parsed } from "./parse";
import { make_parser } from "./parse";

// interface ManualSchema {
//   foo: number;
//   bar: string | boolean;
//   baz: {
//     bln: number | boolean;
//     str: string;
//     num: number;
//   };
//   field_c: [number | boolean, string];
//   field_d: [string, string, string];
//   field_e: [
//     [string, boolean],
//     [string, boolean],
//     [string, boolean],
//     [string, boolean],
//     [string, boolean],
//   ];
// }

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
  field_e: [5, ["s", "b"]],
  field_f: [5, { a: "n", b: "s" }],
  field_g: [5, [4, "s"]],
});

const parsed = parser({ foo: 42, bar: "hello", baz: true });

type AutoSchema = Parsed<typeof parser>;

console.warn(parsed);
if (parsed.ok) {
  const parsed_ok: AutoSchema = parsed.value;
  console.warn(parsed_ok);
}

const parsed2 = parser({
  foo: 42,
  bar: "hello",
  baz: { bln: true, str: "test", num: 123 },
  field_c: [false, "yes"],
  field_d: ["a", "b", "c"],
  field_e: [
    ["x", true],
    ["y", false],
    ["z", true],
    ["w", false],
    ["v", true],
  ],
  field_f: [
    { a: 1, b: "one" },
    { a: 2, b: "two" },
    { a: 3, b: "three" },
    { a: 4, b: "four" },
    { a: 5, b: "five" },
  ],
  field_g: [
    ["a", "b", "c", "d"],
    ["e", "f", "g", "h"],
    ["i", "j", "k", "l"],
    ["m", "n", "o", "p"],
    ["q", "r", "s", "t"],
  ],
});

console.warn(parsed2);
if (parsed2.ok) {
  const parsed_ok: AutoSchema = parsed2.value;
  console.warn(parsed_ok);
}
