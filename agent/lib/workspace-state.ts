import { defineState } from "eve/context";

export const workspace = defineState("agent.workspace", () => ({
  activeDocumentId: null as string | null,
}));
