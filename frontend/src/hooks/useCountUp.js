import { useEffect, useRef, useState } from 'react';

/** Tự động tăng số từ 0 đến giá trị `target` trong khoảng thời gian `duration` ms */
export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Công thức làm mượt hiệu ứng (Ease out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      
      if (progress < 1) {
        raf.current = requestAnimationFrame(step);
      }
    };
    
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}