"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A decorative scroll indicator shaped to match the brand panel's rounded
 * corner next door (a straight run down to the corner, then a quarter-circle
 * arc of the same radius) instead of a straight bar that visually clashes
 * with the curve. Purely cosmetic -- the container's real overflow-y:auto
 * still does the actual scrolling; this just tracks it.
 */
export default function CurveScrollThumb({ containerRef, radius = 100 }) {
  const pathRef = useRef(null);
  const thumbRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Read clientHeight directly rather than trusting the ResizeObserver
    // entry's contentRect -- contentRect excludes padding, but this SVG is
    // positioned absolute within the panel's padding-box (clientHeight),
    // so using contentRect made the arc land short by exactly the panel's
    // vertical padding.
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
    if (!container || !path || !thumb || !height) return;

    const total = path.getTotalLength();

    function update() {
      const max = container.scrollHeight - container.clientHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, container.scrollTop / max)) : 0;
      const point = path.getPointAtLength(progress * total);
      thumb.setAttribute("cx", point.x);
      thumb.setAttribute("cy", point.y);
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
      width={r + 6}
      height={height}
      viewBox={`0 0 ${r + 6} ${height}`}
      className="pointer-events-none absolute top-0 right-0 z-20 hidden lg:block"
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={`M 2,0 L 2,${straightEnd} A ${r},${r} 0 0 1 ${2 + r},${height}`}
        fill="none"
        stroke="var(--color-primary)"
        strokeOpacity="0.15"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle ref={thumbRef} r="4" fill="var(--color-primary)" />
    </svg>
  );
}
