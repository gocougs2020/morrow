import { ImageResponse } from "next/og";

const markPath =
  "M49.28 66.94 75.03 34.96h-6.89L47.91 60.11l-5.49 6.83h6.86ZM0 34.96h42.4v5.11H0zm0 13.32h27.66v5.11H0zm0 13.54h27.66v5.11H0zm69.63-26.86H102v5.11H69.63zm4.71 13.32H102v5.11H74.34zm0 13.54H102v5.11H74.34z";

export function renderAppIcon({
  maskable = false,
  size,
}: {
  readonly maskable?: boolean;
  readonly size: number;
}) {
  const inner = maskable ? Math.round(size * 0.8) : size;

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#000",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <svg fill="none" height={inner} viewBox="0 0 102 102" width={inner} xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0h102v102H0z" fill="#000" />
        <path d={markPath} fill="#fff" />
      </svg>
    </div>,
    { height: size, width: size },
  );
}
