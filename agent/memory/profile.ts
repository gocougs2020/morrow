import { defineMemory } from "eve/memory";
import { byPrincipal } from "eve/memory/scope";
import { fileMemory } from "eve/memory/file";
import { PROFILE_MEMORY_NAMESPACE, profileMemoryBackend } from "../../lib/profile-memory";

export default defineMemory({
  description:
    "Remember durable facts and working preferences for this user. Never store secrets, payment data, or government ID numbers. Do not store a specific client, deal, or project here — those belong in leads, plans, quotes, or documents.",
  namespace: PROFILE_MEMORY_NAMESPACE,
  provider: fileMemory({
    backend: profileMemoryBackend(),
  }),
  scope: byPrincipal,
});
