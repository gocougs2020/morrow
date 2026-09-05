import { appConfig } from "@/app.config";

export const IMAGE_GENERATION_MODEL = appConfig.models.imageGeneration;
export const GENERATE_IMAGE_TOOL = "generate_image";

export type GeneratedImage = {
  readonly base64: string;
  readonly filename: string;
  readonly mediaType: string;
};

export type GenerateImageOutput = {
  readonly images: readonly GeneratedImage[];
  readonly documents?: readonly { id: string; href: string; title: string }[];
  readonly model: string;
  readonly prompt: string;
  readonly quality: string;
  readonly size: string;
};

export const EMPTY_GENERATED_IMAGE_BYTES = new Uint8Array();

export function generatedImageDataUrl(image: GeneratedImage): string {
  return `data:${image.mediaType};base64,${image.base64}`;
}

export function generatedImageDimensions(size?: string): {
  readonly height: number;
  readonly width: number;
} {
  const match = size?.match(/^(\d+)x(\d+)$/);
  if (!match) {
    return { height: 1024, width: 1024 };
  }
  return { height: Number(match[2]), width: Number(match[1]) };
}

export function generatedImageSizeFromOutput(output: unknown): string {
  if (output && typeof output === "object" && "size" in output && typeof output.size === "string") {
    return output.size;
  }
  return "1024x1024";
}

export function generatedImagesFromToolOutput(output: unknown): readonly GeneratedImage[] {
  if (!output || typeof output !== "object" || !("images" in output)) {
    return [];
  }

  const images = output.images;
  if (!Array.isArray(images)) {
    return [];
  }

  return images.flatMap((image) => {
    if (!image || typeof image !== "object") return [];
    const base64 = "base64" in image && typeof image.base64 === "string" ? image.base64 : "";
    const mediaType =
      "mediaType" in image && typeof image.mediaType === "string"
        ? image.mediaType
        : "image/png";
    const filename =
      "filename" in image && typeof image.filename === "string"
        ? image.filename
        : "generated.png";
    return base64 ? [{ base64, filename, mediaType }] : [];
  });
}
