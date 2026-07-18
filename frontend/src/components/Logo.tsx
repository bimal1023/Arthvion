/**
 * Arthvion brand mark — the official "A" logomark (navy triangle with the
 * electric-blue swoosh), served from /public/brand.
 *
 * Variants:
 *  - "color"  → full-color navy mark. For light backgrounds.
 *  - "onDark" → white silhouette of the same mark. For blue brand chips, the
 *               dark sidebar/login panel, and the footer — where the navy
 *               mark would disappear.
 *
 * Same props as before (size / variant / title) so every call site is
 * unchanged. For the full wordmark lockup use <LogoLockup> instead.
 */

interface LogoProps {
  size?: number;
  variant?: "color" | "onDark";
  title?: string;
}

export function Logo({ size = 24, variant = "color", title = "Arthvion" }: LogoProps) {
  const src = variant === "onDark" ? "/brand/arthvion-mark-white.png" : "/brand/arthvion-mark.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt={title}
      style={{ flexShrink: 0, display: "block", objectFit: "contain" }}
    />
  );
}

/**
 * Full logo lockup — mark + "ARTHVION" wordmark + tagline. Use on large,
 * light-background brand moments (verify-email, auth panels). Transparent PNG.
 */
export function LogoLockup({
  width = 220,
  title = "Arthvion — AI operating system for private equity",
  style,
}: {
  width?: number;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/arthvion-lockup.png"
      width={width}
      alt={title}
      style={{ display: "block", height: "auto", maxWidth: "100%", ...style }}
    />
  );
}
