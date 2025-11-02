import React from 'react';
import Spline from '@splinetool/react-spline';
import { motion } from 'framer-motion';

export default function HeroSpline() {
  return (
    <section className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <Spline
          scene="https://prod.spline.design/UngO8SNLfLcyPG7O/scene.splinecode"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Soft glow overlay that doesn't block Spline interaction */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      <div className="relative z-10 flex h-full items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="px-6 text-center"
        >
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            The Journey Through Light
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
            A cinematic, scroll–driven voyage across darkness, discovery, neon dreams,
            dawn, and the glowing horizon.
          </p>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-2 text-xs text-white/70"
        >
          <span>Scroll to begin</span>
          <span className="inline-block h-6 w-3 rounded-full border border-white/40">
            <motion.span
              className="mx-auto mt-1 block h-2 w-[2px] rounded bg-white/70"
              animate={{ y: [0, 12, 0], opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            />
          </span>
        </motion.div>
      </div>
    </section>
  );
}
