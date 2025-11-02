import React from 'react';
import HeroSpline from './components/HeroSpline';
import StoryScroll3D from './components/StoryScroll3D';
import AudioToggle from './components/AudioToggle';
import CustomCursor from './components/CustomCursor';

function App() {
  return (
    <div className="min-h-screen w-screen bg-black font-['Inter','ui-sans-serif',system-ui]">
      <CustomCursor />
      <AudioToggle />
      <HeroSpline />
      <StoryScroll3D />

      {/* Footer credit / ending */}
      <section className="relative z-10 -mt-px bg-black py-16 text-center text-white">
        <div className="mx-auto max-w-4xl px-6">
          <h3 className="text-2xl font-semibold">Thank you for traveling</h3>
          <p className="mt-2 text-white/70">
            You just navigated a living story told with light, motion, and sound.
          </p>
        </div>
      </section>
    </div>
  );
}

export default App;
