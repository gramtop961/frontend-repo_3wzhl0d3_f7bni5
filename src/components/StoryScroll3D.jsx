import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

function Particles({ count = 1000, spread = 100 }) {
  const points = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 0] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = (Math.random() - 0.5) * spread;
      positions[i3 + 2] = (Math.random() - 0.5) * spread;
    }
    return positions;
  }, [count, spread]);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={points.length / 3} array={points} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#c7d2fe" size={0.08} sizeAttenuation depthWrite={false} transparent opacity={0.85} />
    </points>
  );
}

function NeonCity() {
  const group = useRef();
  const boxes = React.useMemo(() => {
    const b = [];
    const grid = 10;
    for (let x = -grid; x <= grid; x++) {
      for (let z = -grid; z <= grid; z++) {
        const h = Math.random() * 6 + 1.5;
        b.push({ position: [x * 1.5, h / 2, z * 1.5], height: h });
      }
    }
    return b;
  }, []);

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += 0.001;
  });

  return (
    <group ref={group}>
      {boxes.map((b, i) => (
        <mesh key={i} position={b.position} castShadow receiveShadow>
          <boxGeometry args={[1, b.height, 1]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#60a5fa"
            emissiveIntensity={2}
            roughness={0.25}
            metalness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function GlowingHorizon() {
  return (
    <group position={[0, -2, -20]}>
      <mesh rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 1, 1]} />
        <meshStandardMaterial color="#0b1020" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -1, 0]} castShadow>
        <torusGeometry args={[12, 1.6, 32, 100]} />
        <meshStandardMaterial emissive="#f59e0b" emissiveIntensity={2.4} color="#f59e0b" />
      </mesh>
      <mesh position={[0, 2, -20]}>
        <sphereGeometry args={[4, 64, 64]} />
        <meshBasicMaterial color="#fde68a" />
      </mesh>
    </group>
  );
}

function Scene() {
  const scroll = useScroll();
  const cam = useRef();
  const ambient = useRef();
  const dir = useRef();
  const fogColor = useRef(new THREE.Color('#030409'));

  useFrame((state) => {
    const o = scroll.offset; // 0..1
    const lerp = THREE.MathUtils.lerp;

    // Camera keyframes for 5 chapters
    const targets = [
      { pos: new THREE.Vector3(0, 0, 12), look: new THREE.Vector3(0, 0, 0) }, // Darkness
      { pos: new THREE.Vector3(0, 1, 6), look: new THREE.Vector3(0, 0, 0) }, // Discovery (orb)
      { pos: new THREE.Vector3(0, 6, 12), look: new THREE.Vector3(0, 0, 0) }, // Neon city
      { pos: new THREE.Vector3(0, 3, 10), look: new THREE.Vector3(0, 1, -6) }, // Sunrise
      { pos: new THREE.Vector3(0, 4, 14), look: new THREE.Vector3(0, 0, -12) }, // Horizon
    ];

    // Map offset to segment
    const seg = o * 4; // 0..4
    const i = Math.floor(seg);
    const t = seg - i;
    const a = targets[i] || targets[0];
    const b = targets[i + 1] || targets[targets.length - 1];

    if (cam.current) {
      cam.current.position.lerpVectors(a.pos, b.pos, t);
      const look = new THREE.Vector3().lerpVectors(a.look, b.look, t);
      cam.current.lookAt(look);
    }

    // Lighting mood & fog progression
    const neonPhase = Math.min(1, Math.max(0, (seg - 1.2) / 1.2));
    const dawn = Math.min(1, Math.max(0, (seg - 2.4) / 1.2));

    if (ambient.current) ambient.current.intensity = lerp(0.08, 0.7, dawn) + neonPhase * 0.25;
    if (dir.current) {
      dir.current.intensity = lerp(0.3, 2.4, dawn);
      dir.current.position.x = lerp(-6, 6, dawn);
      dir.current.position.y = lerp(1, 8, dawn);
      dir.current.color.set(new THREE.Color().lerpColors(new THREE.Color('#3b82f6'), new THREE.Color('#f59e0b'), dawn));
    }

    const colorFrom = new THREE.Color('#030409');
    const colorTo = new THREE.Color('#111827');
    fogColor.current.lerpColors(colorFrom, colorTo, dawn * 0.8 + neonPhase * 0.2);
    state.scene.background = fogColor.current;
    state.scene.fog = new THREE.Fog(state.scene.background, 6, 40);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={[0, 0, 12]} fov={50} />
      <ambientLight ref={ambient} intensity={0.15} />
      <directionalLight ref={dir} position={[0, 3, 5]} intensity={0.8} castShadow />

      {/* Discovery: glowing orb */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshStandardMaterial emissive="#93c5fd" emissiveIntensity={1.8} color="#1e3a8a" roughness={0.35} metalness={0.25} />
      </mesh>

      {/* Neon city */}
      <group position={[0, -2, -6]}>
        <NeonCity />
      </group>

      {/* Sunrise & horizon */}
      <GlowingHorizon />

      {/* Space dust */}
      <group position={[0, 0, 0]}>
        <Particles count={1200} spread={120} />
      </group>
    </>
  );
}

export default function StoryScroll3D() {
  return (
    <section className="relative h-[520vh] w-screen bg-black">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        className="fixed left-0 top-0 z-[5] h-screen w-screen"
      >
        <ScrollControls pages={5} damping={0.2}>
          <Scene />
          {/* Floating HTML for narrative */}
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
