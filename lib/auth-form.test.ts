import { describe, expect, it } from "vitest";
import { EMAIL_NOT_VERIFIED_MESSAGE, VERIFY_EMAIL_EXPIRED_MESSAGE } from "@/lib/auth-email";
import { authFormErrorMessage } from "@/lib/auth-form";

describe("authFormErrorMessage", () => {
  it("rewrites verification codes from the query string", () => {
    expect(authFormErrorMessage("TOKEN_EXPIRED")).toBe(VERIFY_EMAIL_EXPIRED_MESSAGE);
    expect(authFormErrorMessage("EMAIL_NOT_VERIFIED")).toBe(EMAIL_NOT_VERIFIED_MESSAGE);
  });

  it("keeps unrelated messages", () => {
    expect(authFormErrorMessage(new Error("Invalid email or password"))).toBe(
      "Invalid email or password",
    );
  });
});
