import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function AudioToggle() {
  const audioRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = 0.35;
    if (enabled) {
      const play = async () => {
        try {
          await audio.play();
        } catch {}
      };
      play();
    } else {
      audio.pause();
    }
  }, [enabled]);

  return (
    <div className="pointer-events-auto fixed right-4 top-4 z-50">
      <audio
        ref={audioRef}
        // Ambient, royalty-free pad loop
        src="https://cdn.pixabay.com/download/audio/2021/10/27/audio_4b6f2d2b9c.mp3?filename=ambient-10668.mp3"
      />
      <button
        aria-label="Toggle ambient audio"
        onClick={() => setEnabled((v) => !v)}
        className="rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </button>
    </div>
  );
}
