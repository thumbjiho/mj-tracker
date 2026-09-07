"use client";

import { useEffect, useState, type ReactNode } from "react";

function computeBox() {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Ports #layer: a fixed, viewport-centered box every sheet/dialog/menu
 * renders into. The alpha always calls setLayerRot(0) for these (POV builds
 * its own separately-rotated inner wrapper — see PovOverlay), so this never
 * rotates; it only needs to track viewport size.
 */
export function Layer({ children }: { children: ReactNode }) {
  const [box, setBox] = useState(() => computeBox());

  useEffect(() => {
    const update = () => setBox(computeBox());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div id="layer" style={{ width: box.width, height: box.height, transform: "translate(-50%,-50%)" }}>
      {children}
    </div>
  );
}
