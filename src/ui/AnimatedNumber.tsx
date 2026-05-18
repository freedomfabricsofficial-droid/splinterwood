import { useEffect, useRef, useState } from 'react';
import { fmt } from '../systems/format';

export function AnimatedNumber({
  value,
  format = fmt,
  durationMs = 400,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);
  const targetRef = useRef(value);

  useEffect(() => {
    if (value === targetRef.current) return;
    fromRef.current = displayed;
    targetRef.current = value;
    startRef.current = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setDisplayed(cur);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(targetRef.current);
      }
    }
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  // Pulse the class briefly when changing
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (value === fromRef.current) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 350);
    return () => window.clearTimeout(t);
  }, [value]);

  return (
    <span className={`anim-number ${pulse ? 'pulsing' : ''} ${className ?? ''}`}>
      {format(displayed)}
    </span>
  );
}
