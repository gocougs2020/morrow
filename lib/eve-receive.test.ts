import { describe, expect, it } from "vitest";
import { eveReceiveAddress } from "@/lib/eve-receive";

describe("eveReceiveAddress", () => {
  it("uses a non-empty address from the target", () => {
    expect(eveReceiveAddress({ address: " chat-1 " })).toBe("chat-1");
  });

  it("mints a unique token when the target has no address", () => {
    const first = eveReceiveAddress({});
    const second = eveReceiveAddress({ address: "   " });
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(second).not.toBe(first);
  });
});
