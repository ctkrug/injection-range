/** The two glyphs that rain down on a SECURE win. */
const GLYPHS = ["0", "1"] as const;

export interface CelebrationOptions {
  /** How many glyphs to drop. */
  count?: number;
  /** Skip the animation entirely (honors prefers-reduced-motion). */
  reducedMotion?: boolean;
  /** Injectable RNG so the effect is deterministic under test. */
  random?: () => number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Appends a short burst of falling 0/1 glyphs to `container` for the SECURE
 * win, the signature flourish from docs/DESIGN.md. Each glyph removes itself
 * when its fall ends, and any earlier burst is cleared first so retries never
 * stack. Returns the number of glyphs spawned (0 when reduced motion is
 * requested), so the banner always stands on its own without them.
 */
export function spawnCelebration(container: HTMLElement, options: CelebrationOptions = {}): number {
  container.querySelector(".celebration")?.remove();

  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  if (reducedMotion) {
    return 0;
  }

  const count = options.count ?? 24;
  const random = options.random ?? Math.random;

  const layer = document.createElement("div");
  layer.className = "celebration";
  layer.setAttribute("aria-hidden", "true");

  for (let index = 0; index < count; index += 1) {
    const glyph = document.createElement("span");
    glyph.className = "celebration__glyph";
    glyph.textContent = GLYPHS[Math.floor(random() * GLYPHS.length)] ?? "0";
    glyph.style.left = `${random() * 100}%`;
    glyph.style.animationDelay = `${Math.round(random() * 400)}ms`;
    glyph.style.animationDuration = `${900 + Math.round(random() * 700)}ms`;
    glyph.addEventListener("animationend", () => glyph.remove());
    layer.appendChild(glyph);
  }

  container.appendChild(layer);
  return count;
}
