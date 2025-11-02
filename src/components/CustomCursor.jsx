import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    const onLeave = () => setHidden(true);
    const onEnter = () => setHidden(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('mouseenter', onEnter);
    // Hide on touch devices
    const mq = window.matchMedia('(pointer: coarse)');
    if (mq.matches) setHidden(true);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <motion.div
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90"
        animate={{ x: pos.x, y: pos.y, opacity: hidden ? 0 : 0.8 }}
        transition={{ type: 'spring', mass: 0.2, stiffness: 300, damping: 20 }}
      />
      <motion.div
        className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40"
        animate={{ x: pos.x, y: pos.y, opacity: hidden ? 0 : 0.5 }}
        transition={{ type: 'spring', mass: 0.2, stiffness: 120, damping: 15 }}
      />
    </div>
  );
}
