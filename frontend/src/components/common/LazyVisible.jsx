import React, { useEffect, useRef, useState } from 'react';

export default function LazyVisible({
  children,
  force = false,
  minHeight = 320,
  rootMargin = '240px 0px',
  className = '',
}) {
  const hostRef = useRef(null);
  const [visible, setVisible] = useState(force);

  useEffect(() => {
    if (force || visible) {
      if (force) setVisible(true);
      return undefined;
    }

    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [force, rootMargin, visible]);

  return (
    <div ref={hostRef} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
