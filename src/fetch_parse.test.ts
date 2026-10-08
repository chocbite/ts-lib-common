import { describe, expect, it, vi } from "vitest";
import type { StateREA, StateREAW, StateResult } from "@chocbite/ts-lib-state";
import { make_fetch_parser } from "./fetch_parse";

describe("make_fetch_parser", () => {
  it("maps read-only and writable leaves to their state types", () => {
    const parsed = make_fetch_parser(
      () => "/user",
      1_000,
      { id: "n", name: "sw" },
      async () => {},
    );

    const read_only: StateREA<number> = parsed.id;
    const writable: StateREAW<string> = parsed.name;
    expect(read_only).toBeDefined();
    expect(writable).toBeDefined();
  });

  it("fetches once for a leaf subscription and projects its value", async () => {
    const fetch_mock = vi.fn().mockResolvedValue(new Response('{"name":"Ada"}'));
    vi.stubGlobal("fetch", fetch_mock);
    const user = make_fetch_parser(() => "/user", 60_000, { name: "s" });
    const update = vi.fn<(result: StateResult<string>) => void>();

    user.name.sub(update);
    await vi.waitFor(() => expect(update).toHaveBeenCalled());

    expect(fetch_mock).toHaveBeenCalledWith("/user", expect.any(Object));
    const first_result = update.mock.calls[0]?.[0];
    expect(first_result?.ok && first_result.value).toBe("Ada");
    user.name.unsub(update);
    vi.unstubAllGlobals();
  });

  it("sends nested writable values as a partial object", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const user = make_fetch_parser(
      () => "/user",
      1_000,
      { settings: { newsletter: "bw" } },
      send,
    );

    const result = await user.settings.newsletter.write(true);

    expect(result.ok).toBe(true);
    expect(send).toHaveBeenCalledWith({ settings: { newsletter: true } });
  });

  it("uses an array write encoder for indexed writable values", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const user = make_fetch_parser(
      () => "/user",
      1_000,
      {
        aliases: [0, "sw", (alias: string) => ({ num: 1, alias })] as const,
      },
      send,
    );

    const result = await user.aliases[5].write!("joe");

    expect(result.ok).toBe(true);
    expect(send).toHaveBeenCalledWith({ aliases: { num: 1, alias: "joe" } });
  });
});
