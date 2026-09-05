/**
 * Deployer configuration.
 *
 * Edit this file after you clone or fork the repo, then restart `npm run dev`
 * or redeploy. Secrets, host URLs, and access allowlists stay in `.env.local`
 * / Vercel env — this file is for product defaults that should ship with the UI.
 * Never put emails or domains here.
 *
 * See README.md for install, environment variables, and deployment.
 */

export type AppSkillConfig = {
  /** When false, the skill is hidden from the home page and Settings, and the agent is told not to load it. */
  enabled: boolean;
  /** When true, show a suggestion chip on the home page. */
  suggest: boolean;
  title: string;
  emoji: string;
};

export type AppConfig = {
  brand: {
    name: string;
    tagline: string;
  };
  home: {
    promptPlaceholder: string;
    followUpPlaceholder: string;
  };
  models: {
    /** Fast chat model for simple first prompts, and for first-prompt routing. */
    chatFast: string;
    /** Chat model when the first prompt needs analysis or thinking. */
    chatLow: string;
    /** Chat model when the first prompt is unusually complex. */
    chatHigh: string;
    instructions: string;
    sessionTitle: string;
    sessionMemory: string;
    /** Model used only for compaction checkpoints. */
    compaction: string;
    embeddings: string;
    imageGeneration: string;
    transcription: string;
    contextWindows: Readonly<Record<string, number>>;
  };
  memory: {
    relatedSessionLimit: number;
    relatedSessionMinScore: number;
    /** Abort HyDE (hypothetical reply) if it exceeds this; recall continues with the prompt embedding. */
    hydeTimeoutMs: number;
  };
  skills: Record<string, AppSkillConfig>;
};

export const appConfig = {
  brand: {
    name: "Morrow",
    tagline: "A deployable workspace for eve agents. Don't wait for tomorrow—deploy with Morrow",
  },

  home: {
    promptPlaceholder: "Ask anything…",
    followUpPlaceholder: "Ask a follow-up…",
  },

  models: {
    chatFast: "openai/gpt-5.6-luna-fast",
    chatLow: "openai/gpt-5.6-luna",
    chatHigh: "openai/gpt-5.6-sol",
    instructions: "openai/gpt-5.6-luna",
    sessionTitle: "openai/gpt-5.6-luna",
    sessionMemory: "openai/gpt-5.6-luna",
    compaction: "openai/gpt-5.6-luna",
    embeddings: "openai/text-embedding-3-small",
    imageGeneration: "openai/gpt-image-2",
    transcription: "gpt-transcribe",
    contextWindows: {
      "openai/gpt-5.6-luna-fast": 1_050_000,
      "openai/gpt-5.6-luna": 1_050_000,
      "openai/gpt-5.6-sol": 1_050_000,
    },
  },

  memory: {
    relatedSessionLimit: 8,
    relatedSessionMinScore: 0.55,
    hydeTimeoutMs: 1000,
  },

  /**
   * Built-in skills under `agent/skills/<slug>/SKILL.md`.
   * Set `enabled: false` to hide one. Set `suggest: true` to show it on the home page.
   * Add a new folder under `agent/skills/` and an entry here to register another default.
   */
  skills: {
    brainstorming: {
      enabled: true,
      suggest: true,
      title: "Brainstorm",
      emoji: "💡",
    },
    write: {
      enabled: true,
      suggest: true,
      title: "Write",
      emoji: "✍️",
    },
    research: {
      enabled: true,
      suggest: true,
      title: "Research",
      emoji: "🔍",
    },
    "meeting-prep": {
      enabled: true,
      suggest: true,
      title: "Meeting prep",
      emoji: "📋",
    },
    plan: {
      enabled: true,
      suggest: true,
      title: "Plan",
      emoji: "🗺️",
    },
    image: {
      enabled: true,
      suggest: true,
      title: "Image",
      emoji: "🎨",
    },
    household: {
      enabled: true,
      suggest: true,
      title: "Household",
      emoji: "🏠",
    },
    story: {
      enabled: true,
      suggest: true,
      title: "Story",
      emoji: "📖",
    },
    decide: {
      enabled: true,
      suggest: true,
      title: "Decide",
      emoji: "⚖️",
    },
    "weekly-review": {
      enabled: true,
      suggest: true,
      title: "Weekly review",
      emoji: "📅",
    },
    intake: {
      enabled: true,
      suggest: false,
      title: "Intake",
      emoji: "👋",
    },
    files: {
      enabled: true,
      suggest: false,
      title: "Files",
      emoji: "📄",
    },
    memory: {
      enabled: true,
      suggest: false,
      title: "Memory",
      emoji: "🧠",
    },
  },
} as const satisfies AppConfig;
