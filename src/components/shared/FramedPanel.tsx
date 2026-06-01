// Visual chrome helpers introduced in v0.68 for the asset-pack UI skin.
//
// FramedPanel — wraps content with a `.framed` class. The 9-slice border
// and the flat cream background come from CSS. No inline texture style
// (panels are flat cream; texture lives only on small icon backdrops).
//
// usePaperTexture — returns an inline style object that randomizes the
// background-position so each call site shows a different crop of the
// large paper-texture.png. Used for icon backdrops (.card-icon etc).
// Stable per-mount.
import React, { useMemo } from 'react';

const PAPER_W = 1923;
const PAPER_H = 3342;

export function usePaperTexture(): React.CSSProperties {
  return useMemo(() => {
    const x = -Math.floor(Math.random() * (PAPER_W - 600));
    const y = -Math.floor(Math.random() * (PAPER_H - 600));
    return { backgroundPosition: `${x}px ${y}px` };
  }, []);
}

export function FramedPanel({ children, className = '', style }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`framed ${className}`} style={style}>
      {children}
    </div>
  );
}
