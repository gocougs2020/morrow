import { renderAppIcon } from "@/lib/app-icon";
import { isPwaIconSize, pwaIconSizes } from "@/lib/pwa";

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(pwaIconSizes).map((size) => ({ size }));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const { size } = await context.params;
  if (!isPwaIconSize(size)) {
    return new Response("Not found", { status: 404 });
  }

  const icon = pwaIconSizes[size];
  return renderAppIcon(icon);
}
