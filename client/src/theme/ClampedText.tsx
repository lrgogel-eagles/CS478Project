import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

type ClampStyle = CSSProperties & Record<'--clamp-lines', number>;

type ClampedTextProps = {
  text: string;
  lines: number;
  className?: string;
};

export function ClampedText({ text, lines, className = '' }: ClampedTextProps) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const style: ClampStyle = { '--clamp-lines': lines };

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || isExpanded) return;
    const measure = () => setIsClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text, isExpanded]);

  return (
    <>
      <p id={id} ref={ref} className={`clamped-text ${className}`.trim()} data-expanded={isExpanded ? 'true' : undefined} style={style}>
        {text}
      </p>
      {(isClamped || isExpanded) && (
        <button type="button" className="pencil-btn clamp-toggle" aria-controls={id} aria-expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}
