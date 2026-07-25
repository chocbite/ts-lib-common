import { describe, expect, it } from "vitest";
import { make_parser } from "./parse";

describe("make_parser", () => {
  describe("type strings", () => {
    it("should parse single-char types", () => {
      const parse = make_parser({ n: "n", s: "s", b: "b" });
      const result = parse({ n: 1, s: "hi", b: true });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual({ n: 1, s: "hi", b: true });
    });

    it("should parse union type strings", () => {
      const parse = make_parser({ val: "ns" });
      expect(parse({ val: 42 }).ok).toBe(true);
      expect(parse({ val: "hi" }).ok).toBe(true);
      expect(parse({ val: true }).ok).toBe(false);
    });

    it("should parse union type strings containing null", () => {
      const parse = make_parser({ val: "nsbl" });
      expect(parse({ val: 42 }).ok).toBe(true);
      expect(parse({ val: "hi" }).ok).toBe(true);
      expect(parse({ val: true }).ok).toBe(true);
      expect(parse({ val: null }).ok).toBe(true);
    });

    it("should parse null-only type strings", () => {
      const parse = make_parser({ val: "l" });
      expect(parse({ val: null }).ok).toBe(true);
      expect(parse({ val: undefined }).ok).toBe(false);
      expect(parse({ val: 42 }).ok).toBe(false);
    });

    it("should reject wrong types with descriptive error", () => {
      const parse = make_parser({ count: "n" });
      const result = parse({ count: "oops" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(
          "Failed to parse due to member count being wrong type (expected number)",
        );
      }
    });

    it("should list all union options in error", () => {
      const parse = make_parser({ id: "ns" });
      const result = parse({ id: true });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("number or string");
    });
  });

  describe("nested objects", () => {
    const parse = make_parser({
      meta: { name: "s", age: "n", active: "b" },
    });

    it("should accept valid nested objects", () => {
      const result = parse({ meta: { name: "Alice", age: 30, active: true } });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.meta).toEqual({ name: "Alice", age: 30, active: true });
    });

    it("should reject when nested field has wrong type", () => {
      const result = parse({ meta: { name: "Alice", age: "thirty", active: true } });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("meta.age");
        expect(result.error).toContain("wrong type");
      }
    });

    it("should reject when nested value is not an object", () => {
      const result = parse({ meta: "not an object" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("meta");
    });
  });

  describe("string tuples", () => {
    const parse = make_parser({ pair: ["nb", "s"] });

    it("should accept valid tuples", () => {
      expect(parse({ pair: [42, "hi"] }).ok).toBe(true);
      expect(parse({ pair: [true, "hi"] }).ok).toBe(true);
    });

    it("should reject wrong element type", () => {
      const result = parse({ pair: ["wrong", "hi"] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("pair[0]");
    });

    it("should reject wrong length", () => {
      const result = parse({ pair: [1, "hi", "extra"] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("wrong length");
    });

    it("should reject non-arrays", () => {
      const result = parse({ pair: "not an array" });
      expect(result.ok).toBe(false);
    });
  });

  describe("repeated tuples", () => {
    const parse = make_parser({ triple: [3, "s"] });

    it("should accept correct length with matching types", () => {
      expect(parse({ triple: ["a", "b", "c"] }).ok).toBe(true);
    });

    it("should reject wrong length", () => {
      const result = parse({ triple: ["a", "b"] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("wrong length");
    });

    it("should reject wrong element types", () => {
      const result = parse({ triple: ["a", 2, "c"] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("triple[1]");
    });
  });

  describe("variable-length arrays", () => {
    const parse = make_parser({ items: [0, "n"] });

    it("should accept empty arrays", () => {
      expect(parse({ items: [] }).ok).toBe(true);
    });

    it("should accept arrays of correct type", () => {
      expect(parse({ items: [1, 2, 3, 4, 5] }).ok).toBe(true);
    });

    it("should reject arrays with wrong element types", () => {
      const result = parse({ items: [1, 2, "three"] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("items[2]");
    });

    it("should reject non-arrays", () => {
      expect(parse({ items: 42 }).ok).toBe(false);
    });
  });

  describe("json string input", () => {
    const parse = make_parser({ x: "n" });

    it("should parse valid json strings", () => {
      expect(parse('{"x": 5}').ok).toBe(true);
    });

    it("should reject invalid json", () => {
      const result = parse("{bad}");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Failed to parse valid json");
    });
  });

  describe("non-object input", () => {
    const parse = make_parser({ x: "n" });

    it("should reject null", () => {
      expect(parse(null).ok).toBe(false);
    });

    it("should reject arrays", () => {
      expect(parse([1, 2]).ok).toBe(false);
    });

    it("should reject primitives", () => {
      expect(parse(42).ok).toBe(false);
      expect(parse(true).ok).toBe(false);
    });
  });

  describe("optional fields", () => {
    describe("optional primitives", () => {
      const parse = make_parser({ name: "s", age: "?n" });

      it("should accept when optional field is present with correct type", () => {
        const result = parse({ name: "Alice", age: 30 });
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toEqual({ name: "Alice", age: 30 });
      });

      it("should accept when optional field is undefined", () => {
        const result = parse({ name: "Alice", age: undefined });
        expect(result.ok).toBe(true);
      });

      it("should accept when optional field is missing", () => {
        const result = parse({ name: "Alice" });
        expect(result.ok).toBe(true);
      });

      it("should reject null without the null type character", () => {
        const result = parse({ name: "Alice", age: null });
        expect(result.ok).toBe(false);
      });

      it("should reject when optional field has wrong type", () => {
        const result = parse({ name: "Alice", age: "thirty" });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain("age");
      });
    });

    describe("optional arrays", () => {
      const parse = make_parser({ name: "s", scores: ["?", [0, "n"]] as const });

      it("should accept when optional array is present", () => {
        const result = parse({ name: "Alice", scores: [1, 2, 3] });
        expect(result.ok).toBe(true);
      });

      it("should accept when optional array is missing", () => {
        const result = parse({ name: "Alice" });
        expect(result.ok).toBe(true);
      });

      it("should reject null without the null type character", () => {
        const result = parse({ name: "Alice", scores: null });
        expect(result.ok).toBe(false);
      });

      it("should reject when optional array has wrong element types", () => {
        const result = parse({ name: "Alice", scores: [1, "two", 3] });
        expect(result.ok).toBe(false);
      });
    });

    describe("optional objects", () => {
      const parse = make_parser({ name: "s", addr: ["?", { street: "s", zip: "n" }] as const });

      it("should accept when optional object is present", () => {
        const result = parse({ name: "Alice", addr: { street: "Main St", zip: 12345 } });
        expect(result.ok).toBe(true);
      });

      it("should accept when optional object is missing", () => {
        const result = parse({ name: "Alice" });
        expect(result.ok).toBe(true);
      });

      it("should reject when optional object has wrong field types", () => {
        const result = parse({ name: "Alice", addr: { street: "Main St", zip: "bad" } });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain("addr.zip");
      });
    });
  });

  describe("complex schema", () => {
    const parse = make_parser({
      foo: "n",
      bar: "sb",
      baz: { bln: "nb", str: "s", num: "n" },
      field_c: ["nb", "s"],
      field_d: [3, "s"],
      field_e: [0, "s"],
    });

    it("should accept a fully valid complex object", () => {
      const result = parse({
        foo: 42,
        bar: "hello",
        baz: { bln: true, str: "test", num: 1 },
        field_c: [7, "yes"],
        field_d: ["a", "b", "c"],
        field_e: ["x", "y"],
      });
      expect(result.ok).toBe(true);
    });

    it("should reject when nested field fails", () => {
      const result = parse({
        foo: 42,
        bar: "hello",
        baz: { bln: "wrong", str: "test", num: 1 },
        field_c: [7, "yes"],
        field_d: ["a", "b", "c"],
        field_e: ["x", "y"],
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("baz.bln");
    });
  });
});
