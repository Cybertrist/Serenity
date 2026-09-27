import { useMemo } from "react";
import { encodeQr, qrPath } from "./qr";

/**
 * The authenticator link as a QR code. Always dark on white, in both themes: a scanner reads
 * contrast, not taste. The link stays on this page, nothing is sent anywhere to draw it.
 */
export function TotpQr({ uri, size = 148 }: { uri: string; size?: number }) {
  const { path, modules } = useMemo(() => {
    const matrix = encodeQr(uri);
    return { path: qrPath(matrix, 3), modules: matrix.length + 6 };
  }, [uri]);
  return (
    <span className="block shrink-0 rounded-[12px] bg-white p-1.5 shadow-[0_0_0_1px_var(--color-line-strong),0_14px_30px_-16px_rgb(0_0_0/0.6)]">
      <svg
        role="img"
        aria-label="QR code à scanner avec ton appli d'authentification"
        width={size}
        height={size}
        viewBox={`0 0 ${String(modules)} ${String(modules)}`}
        shapeRendering="crispEdges"
        className="block"
      >
        <path d={path} fill="#0b1222" />
      </svg>
    </span>
  );
}
