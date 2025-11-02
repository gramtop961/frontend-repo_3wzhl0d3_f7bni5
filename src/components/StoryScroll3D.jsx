import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

function Particles({ count = 1000, spread = 140 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3 + 0] = (Math.random() - 0.5) * spread;
      arr[i3 + 1] = (Math.random() - 0.5) * spread;
      arr[i3 + 2] = (Math.random() - 0.5) * spread;
    }
    return arr;
  }, [count, spread]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#dbeafe" size={0.08} sizeAttenuation depthWrite={false} transparent opacity={0.85} />
    </points>
  );
}

function NeonCity() {
  const group = useRef();

  const palette = useMemo(
    () => [
      // Cool
      { base: '#38bdf8', emissive: '#22d3ee' }, // sky/cyan
      { base: '#60a5fa', emissive: '#93c5fd' }, // blue
      { base: '#7c3aed', emissive: '#a78bfa' }, // violet
      { base: '#06b6d4', emissive: '#22d3ee' }, // cyan
      // Warm accents
      { base: '#f59e0b', emissive: '#fbbf24' }, // amber
      { base: '#ef4444', emissive: '#fb7185' }, // red
      { base: '#f472b6', emissive: '#f9a8d4' }, // pink
      { base: '#10b981', emissive: '#34d399' }, // emerald
    ],
    []
  );

  const boxes = useMemo(() => {
    const b = [];
    const grid = 10;
    for (let x = -grid; x <= grid; x++) {
      for (let z = -grid; z <= grid; z++) {
        const h = Math.random() * 6 + 1.5;
        const colorIdx = Math.floor(Math.random() * palette.length);
        b.push({ position: [x * 1.5, h / 2, z * 1.5], height: h, ci: colorIdx });
      }
    }
    return b;
  }, [palette]);

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += 0.0012;
  });

  return (
    <group ref={group}>
      {boxes.map((b, i) => {
        const { base, emissive } = palette[b.ci];
        // Slight per-building variation
        const rough = THREE.MathUtils.clamp(0.2 + Math.random() * 0.3, 0.15, 0.6);
        const metal = THREE.MathUtils.clamp(0.4 + Math.random() * 0.4, 0.3, 0.85);
        const eInt = 0.6 + Math.random() * 1.6; // soft to bright
        return (
          <mesh key={i} position={b.position} castShadow receiveShadow>
            <boxGeometry args={[1, b.height, 1]} />
            <meshPhysicalMaterial
              color={base}
              emissive={emissive}
              emissiveIntensity={eInt}
              roughness={rough}
              metalness={metal}
              clearcoat={0.7}
              clearcoatRoughness={0.35}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function SunAndHorizon() {
  const sun = useRef();

  useFrame(({ clock }) => {
    if (sun.current) {
      const t = clock.getElapsedTime();
      sun.current.rotation.y = t * 0.1;
    }
  });

  return (
    <group position={[0, -2, -20]}>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 1, 1]} />
        <meshStandardMaterial color="#0a0f1e" roughness={1} metalness={0} />
      </mesh>

      {/* Horizon ring */}
      <mesh position={[0, -1, 0]} castShadow>
        <torusGeometry args={[12, 1.6, 32, 100]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.2} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Sun with warm emissive and a subtle halo */}
      <group ref={sun} position={[0, 2, -20]}>
        {/* Core */}
        <mesh>
          <sphereGeometry args={[4, 64, 64]} />
          <meshStandardMaterial color="#ffb648" emissive="#ffae00" emissiveIntensity={3.2} roughness={0.25} metalness={0.05} />
        </mesh>
        {/* Halo */}
        <mesh>
          <sphereGeometry args={[4.6, 32, 32]} />
          <meshBasicMaterial color="#ffae00" transparent opacity={0.2} />
        </mesh>
        {/* Inner light boost */}
        <pointLight color="#ffd166" intensity={2.2} distance={50} decay={2} />
      </group>
    </group>
  );
}

function Scene() {
  const scroll = useScroll();
  const cam = useRef();
  const ambient = useRef();
  const dirWarm = useRef();
  const dirCool = useRef();
  const fogColor = useRef(new THREE.Color('#07091a'));

  useFrame((state) => {
    const o = scroll.offset; // 0..1
    const lerp = THREE.MathUtils.lerp;

    const targets = [
      { pos: new THREE.Vector3(0, 0, 12), look: new THREE.Vector3(0, 0, 0) },
      { pos: new THREE.Vector3(0, 1, 6), look: new THREE.Vector3(0, 0, 0) },
      { pos: new THREE.Vector3(0, 6, 12), look: new THREE.Vector3(0, 0, 0) },
      { pos: new THREE.Vector3(0, 3, 10), look: new THREE.Vector3(0, 1, -6) },
      { pos: new THREE.Vector3(0, 4, 14), look: new THREE.Vector3(0, 0, -12) },
    ];

    const seg = o * 4;
    const i = Math.floor(seg);
    const t = seg - i;
    const a = targets[i] || targets[0];
    const b = targets[i + 1] || targets[targets.length - 1];

    if (cam.current) {
      cam.current.position.lerpVectors(a.pos, b.pos, t);
      const look = new THREE.Vector3().lerpVectors(a.look, b.look, t);
      cam.current.lookAt(look);
    }

    // Lighting blend: cool neon to warm sunrise
    const neonPhase = Math.min(1, Math.max(0, (seg - 1.0) / 1.2));
    const dawn = Math.min(1, Math.max(0, (seg - 2.2) / 1.2));

    if (ambient.current) ambient.current.intensity = lerp(0.12, 0.7, dawn) + neonPhase * 0.25;
    if (dirCool.current) {
      dirCool.current.intensity = lerp(1.4, 0.6, dawn);
      dirCool.current.color.set('#60a5fa');
      dirCool.current.position.set(-6, 4, 6);
    }
    if (dirWarm.current) {
      dirWarm.current.intensity = lerp(0.3, 2.4, dawn);
      dirWarm.current.color.set('#f59e0b');
      dirWarm.current.position.set(6, lerp(1, 8, dawn), 2);
    }

    // Fog/background evolves from deep blue to lighter dusk
    const colorFrom = new THREE.Color('#07091a');
    const colorTo = new THREE.Color('#0e1629');
    fogColor.current.lerpColors(colorFrom, colorTo, dawn * 0.8 + neonPhase * 0.2);
    state.scene.background = fogColor.current;
    state.scene.fog = new THREE.Fog(state.scene.background, 6, 42);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={[0, 0, 12]} fov={50} />
      <ambientLight ref={ambient} intensity={0.18} />
      <directionalLight ref={dirCool} position={[-6, 4, 6]} intensity={1.1} castShadow />
      <directionalLight ref={dirWarm} position={[6, 3, 2]} intensity={0.8} castShadow />

      {/* Discovery orb */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshPhysicalMaterial
          color="#1e3a8a"
          emissive="#93c5fd"
          emissiveIntensity={2.2}
          roughness={0.35}
          metalness={0.3}
          clearcoat={0.4}
        />
      </mesh>

      {/* Neon city */}
      <group position={[0, -2, -6]}>
        <NeonCity />
      </group>

      {/* Sunrise & horizon */}
      <SunAndHorizon />

      {/* Space dust */}
      <group position={[0, 0, 0]}>
        <Particles count={1000} spread={140} />
      </group>
    </>
  );
}

export default function StoryScroll3D() {
  return (
    <section className="relative h-[520vh] w-screen bg-black">
      <Canvas
        dpr={[1, 1.5]}
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={(state) => {
          state.gl.setClearColor('#07091a', 1);
        }}
        className="fixed left-0 top-0 z-[5] h-screen w-screen"
      >
        <ScrollControls pages={5} damping={0.2}>
          <Scene />
          <Scroll html>
            <div className="pointer-events-none relative z-10 text-white">
              <Chapter y="10vh" title="Darkness" text="Where silence breathes and stars are seeds." />
              <Chapter y="110vh" title="Discovery" text="A pulse of curiosity, a spark in the void." />
              <Chapter y="210vh" title="Neon City" text="Electric dreams weave between glass canyons." />
              <Chapter y="310vh" title="Sunrise" text="Warmth spills over edges, shadows learn to glow." />
              <Chapter y="410vh" title="Horizon" text="Beyond the known, light draws a new line." />
            </div>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </section>
  );
}

function Chapter({ y = 0, title, text }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ margin: '-20% 0px -20% 0px', once: false }}
      transition={{ duration: 0.8 }}
      style={{ position: 'absolute', top: y, left: '50%', transform: 'translateX(-50%)' }}
      className="w-[88vw] max-w-3xl text-center"
    >
      <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 sm:text-base">{text}</p>
    </motion.div>
  );
}
