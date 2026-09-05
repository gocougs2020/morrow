import { NextResponse } from "next/server";
import { appConfig } from "@/app.config";
import { requireApiSession } from "@/lib/api";
import { estimateTranscriptionCostUsd } from "@/lib/model-prices";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { recordModelUsage } from "@/lib/record-usage";
import { runWithUsageScope } from "@/lib/usage-scope";

const maxAudioBytes = 25 * 1024 * 1024;
const openaiTranscriptionUrl = "https://api.openai.com/v1/audio/transcriptions";
const transcriptionModel = appConfig.models.transcription;

function audioMediaType(file: File) {
  return file.type.split(";")[0]?.trim() || "audio/webm";
}

function audioFilename(file: File) {
  if (file.name.trim()) return file.name;
  const mediaType = audioMediaType(file);
  if (mediaType.includes("mp4") || mediaType.includes("m4a")) return "recording.m4a";
  if (mediaType.includes("mp3") || mediaType.includes("mpeg")) return "recording.mp3";
  if (mediaType.includes("wav")) return "recording.wav";
  return "recording.webm";
}

export async function POST(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  if (!rateLimit(`transcribe:${session.user.id}`, { limit: 10, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "Audio is required." }, { status: 400 });
  }
  if (audio.size > maxAudioBytes) {
    return NextResponse.json({ error: "Recording is too large." }, { status: 413 });
  }

  const file = new File([await audio.arrayBuffer()], audioFilename(audio), {
    type: audioMediaType(audio),
  });
  const openaiForm = new FormData();
  openaiForm.append("file", file);
  openaiForm.append("model", transcriptionModel);

  try {
    const openaiResponse = await fetch(openaiTranscriptionUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: openaiForm,
    });
    const payload = (await openaiResponse.json().catch(() => ({}))) as {
      error?: { message?: string };
      text?: string;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        seconds?: number;
        type?: string;
      };
    };
    if (!openaiResponse.ok) {
      console.error("OpenAI transcription failed", openaiResponse.status, payload.error?.message);
      return NextResponse.json(
        { error: payload.error?.message ?? "Unable to transcribe audio." },
        { status: 502 },
      );
    }
    const usage = payload.usage;
    void runWithUsageScope({ userId: session.user.id }, () =>
      recordModelUsage({
        costUsd:
          typeof usage?.input_tokens === "number"
            ? undefined
            : estimateTranscriptionCostUsd(usage?.seconds, audio.size),
        inputTokens: usage?.input_tokens ?? 0,
        modelId: transcriptionModel,
        outputTokens: usage?.output_tokens ?? 0,
        purpose: "transcription",
        userId: session.user.id,
      }),
    );
    return NextResponse.json({ text: payload.text?.trim() ?? "" });
  } catch (transcriptionError) {
    console.error("Transcription failed", transcriptionError);
    return NextResponse.json({ error: "Unable to transcribe audio." }, { status: 502 });
  }
}
