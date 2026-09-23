"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A decorative scroll indicator that reads as belonging to the dark brand
 * panel, not the light form panel: a small glowing white bead (matching the
 * brand panel's own floating accent dots) that rides along a path shaped to
 * match the panel's rounded corner -- straight down the seam, then the same
 * quarter-circle radius as the curve itself. The path itself has no visible
 * stroke, so on the light side the bead is invisible; it only reads as
 * motion once it's traveling over the dark purple curve, which is the point.
 * Purely cosmetic -- the container's real overflow-y:auto still does the
 * actual scrolling, this just tracks it.
 */
export default function CurveScrollThumb({ containerRef, radius = 100 }) {
  const pathRef = useRef(null);
  const thumbRef = useRef(null);
  const glowRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Read clientHeight directly rather than trusting the ResizeObserver
    // entry's contentRect -- contentRect excludes padding, but this SVG is
    // positioned in the panel's padding-box (clientHeight), so trusting
    // contentRect made the arc land short by the panel's vertical padding.
    const ro = new ResizeObserver(() => {
      setHeight(container.clientHeight);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    const path = pathRef.current;
    const thumb = thumbRef.current;
    const glow = glowRef.current;
    if (!container || !path || !thumb || !glow || !height) return;

    const total = path.getTotalLength();

    function update() {
      const max = container.scrollHeight - container.clientHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, container.scrollTop / max)) : 0;
      const point = path.getPointAtLength(progress * total);
      thumb.setAttribute("cx", point.x);
      thumb.setAttribute("cy", point.y);
      glow.setAttribute("cx", point.x);
      glow.setAttribute("cy", point.y);
    }

    update();
    container.addEventListener("scroll", update, { passive: true });
    return () => container.removeEventListener("scroll", update);
  }, [containerRef, height]);

  if (!height) return null;

  const r = Math.min(radius, height / 2);
  const straightEnd = height - r;

  return (
    <svg
      width={r + 10}
      height={height}
      viewBox={`0 0 ${r + 10} ${height}`}
      className="pointer-events-none absolute top-0 right-0 z-20 hidden lg:block"
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={`M 2,0 L 2,${straightEnd} A ${r},${r} 0 0 1 ${2 + r},${height}`}
        fill="none"
        stroke="none"
      />
      <circle ref={glowRef} r="9" fill="white" opacity="0.5" style={{ filter: "blur(6px)" }} />
      <circle ref={thumbRef} r="3.5" fill="white" />
    </svg>
  );
}
