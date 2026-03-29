import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { instant_promise, is_promise_like, sleep, sleep_lazy } from "./async";

describe("is_promise_like", () => {
  it("returns true for a native Promise", () => {
    expect(is_promise_like(Promise.resolve(1))).toBe(true);
  });

  it("returns true for an object with a then function", () => {
    expect(is_promise_like({ then: () => {} })).toBe(true);
  });

  it("returns true for an instant_promise", () => {
    expect(is_promise_like(instant_promise(42))).toBe(true);
  });

  it("returns false for null", () => {
    expect(is_promise_like(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(is_promise_like(undefined)).toBe(false);
  });

  it("returns false for a plain object without then", () => {
    expect(is_promise_like({ value: 1 })).toBe(false);
  });

  it("returns false for an object where then is not a function", () => {
    expect(is_promise_like({ then: 42 })).toBe(false);
  });

  it("returns false for a number", () => {
    expect(is_promise_like(42)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(is_promise_like("promise")).toBe(false);
  });
});

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves after the given number of milliseconds", async () => {
    const promise = sleep(100);
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });

  it("does not resolve before the given time", async () => {
    let resolved = false;
    sleep(100).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(99);
    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);
  });

  it("resolves with the provided argument", async () => {
    const promise = sleep(50, "hello");
    vi.advanceTimersByTime(50);
    await expect(promise).resolves.toBe("hello");
  });

  it("resolves with undefined when no argument is given", async () => {
    const promise = sleep(50);
    vi.advanceTimersByTime(50);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe("sleep_lazy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves after the given number of milliseconds", async () => {
    const promise = sleep_lazy(100, () => "done");
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBe("done");
  });

  it("calls the factory function only after the delay", async () => {
    const factory = vi.fn(() => 99);
    const promise = sleep_lazy(100, factory);
    expect(factory).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBe(99);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("resolves with the return value of the factory function", async () => {
    const promise = sleep_lazy(50, () => ({ key: "value" }));
    vi.advanceTimersByTime(50);
    await expect(promise).resolves.toEqual({ key: "value" });
  });
});

describe("instant_promise", () => {
  it("resolves with the given value", async () => {
    await expect(instant_promise(42)).resolves.toBe(42);
  });

  it("calls the then callback synchronously", () => {
    let called = false;
    instant_promise("sync").then(() => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it("chains multiple then calls synchronously", () => {
    const results: number[] = [];
    instant_promise(1)
      .then((v) => {
        results.push(v);
        return instant_promise(v + 1);
      })
      .then((v) => {
        results.push(v as number);
        return instant_promise(v + 1);
      });
    expect(results).toEqual([1, 2]);
  });

  it("returns the inner promise when then returns a PromiseLike", async () => {
    const inner = Promise.resolve(100);
    const result = instant_promise(0).then(() => inner);
    expect(result).toBe(inner);
  });

  it("rejects when the then callback throws", async () => {
    const err = new Error("boom");
    const result = instant_promise(1).then(() => {
      throw err;
    });
    await expect(result).rejects.toBe(err);
  });

  it("is recognised as promise-like by is_promise_like", () => {
    expect(is_promise_like(instant_promise(0))).toBe(true);
  });
});
