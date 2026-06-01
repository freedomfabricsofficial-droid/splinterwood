import { useEffect, useRef, useState } from 'react';
import { fmt } from '../systems/format';
import { bToNumber, type BigLike } from '../util/bignum';

// Accepts either a plain number or a Decimal (BigLike). For animation
// purposes the value is converted to a JS number — at extreme magnitudes
// the animation between two values would be imperceptible anyway, and the
// final displayed text comes from fmt() which correctly handles Decimal
// formatting via formatBig.
export function AnimatedNumber({
  value,
  format = (n: number) => fmt(n),
  durationMs = 400,
  className,
}: {
  value: BigLike;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  // Convert to plain number for animation. Massive values will be near
  // Infinity, which is fine — the format() call uses fmt() which is
  // Decimal-aware so the display itself remains correct.
  const valueAsNum = bToNumber(value);
  const [displayed, setDisplayed] = useState(valueAsNum);
  const fromRef = useRef(valueAsNum);
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);
  const targetRef = useRef(valueAsNum);

  useEffect(() => {
    if (valueAsNum === targetRef.current) return;
    fromRef.current = displayed;
    targetRef.current = valueAsNum;
    startRef.current = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - startRef.current) / durationMs);
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
  }, [valueAsNum, durationMs]);

  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (valueAsNum === fromRef.current) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 350);
    return () => window.clearTimeout(t);
  }, [valueAsNum]);

  return (
    <span className={`anim-number ${pulse ? 'pulsing' : ''} ${className ?? ''}`}>
      {format(Math.floor(displayed))}
    </span>
  );
}
