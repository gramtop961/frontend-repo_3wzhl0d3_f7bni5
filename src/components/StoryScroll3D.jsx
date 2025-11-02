import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// --- Procedural Building Shader (windows + rough facade via triplanar-ish sampling) ---
// We avoid external texture files and generate a believable city facade with lit windows.

function BuildingMaterial({ base = '#4b5563', glow = '#93c5fd', emissiveBoost = 1.0 }) {
  const materialRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBase: { value: new THREE.Color(base) },
      uGlow: { value: new THREE.Color(glow) },
      uEmissiveBoost: { value: emissiveBoost },
      uSeed: { value: Math.random() * 1000 },
      uRoughness: { value: 0.55 },
      uMetalness: { value: 0.25 },
    }),
    [base, glow, emissiveBoost]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <shaderMaterial
      ref={materialRef}
      uniforms={uniforms}
      vertexShader={`
        varying vec3 vPos;
        varying vec3 vNormalW;
        varying vec3 vWorld;
        void main(){
          vPos = position;
          vNormalW = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorld = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `}
      fragmentShader={`
        precision highp float;
        varying vec3 vPos;
        varying vec3 vNormalW;
        varying vec3 vWorld;
        uniform float uTime;
        uniform vec3 uBase;
        uniform vec3 uGlow;
        uniform float uEmissiveBoost;
        uniform float uSeed;
        uniform float uRoughness;
        uniform float uMetalness;

        // 2D hash
        float hash(vec2 p){
          p = 50.0 * fract(p * 0.3183099 + vec2(0.71, 0.113));
          return -1.0 + 2.0 * fract(p.x * p.y * (p.x + p.y));
        }

        // Simple value noise
        float noise(vec3 p){
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f*f*(3.0-2.0*f);
          float n = mix(
            mix(mix(hash(i.xy + vec2(0.0,0.0)), hash(i.xy + vec2(1.0,0.0)), f.x),
                mix(hash(i.xy + vec2(0.0,1.0)), hash(i.xy + vec2(1.0,1.0)), f.x), f.y),
            mix(mix(hash(i.xy + vec2(0.0,0.0+1.0)), hash(i.xy + vec2(1.0,0.0+1.0)), f.x),
                mix(hash(i.xy + vec2(0.0,1.0+1.0)), hash(i.xy + vec2(1.0,1.0+1.0)), f.x), f.y), f.z);
          return 0.5 + 0.5*n;
        }

        // Triplanar-like UVs
        vec3 triplanar(vec3 p){
          vec3 ap = abs(vNormalW);
          ap = max(ap, 0.001);
          ap /= (ap.x + ap.y + ap.z);
          vec3 xProj = vec3(p.yz, 0.0);
          vec3 yProj = vec3(p.xz, 0.0);
          vec3 zProj = vec3(p.xy, 0.0);
          return ap.x * xProj + ap.y * yProj + ap.z * zProj;
        }

        // Procedural window grid mask
        float windowMask(vec2 uv, float scale, float seed){
          uv *= scale;
          vec2 g = fract(uv);
          vec2 id = floor(uv);

          // window on/off per cell
          float rnd = fract(sin(dot(id + seed, vec2(12.9898,78.233))) * 43758.5453);
          float lit = step(0.55, rnd);

          // window bezel
          float frame = step(0.08, g.x) * step(0.08, g.y) * step(g.x, 0.92) * step(g.y, 0.88);

          return lit * frame;
        }

        void main(){
          // Base albedo with subtle concrete variation
          vec3 p = vWorld * 0.25 + vec3(uSeed, 0.0, 0.0);
          float n = noise(p);
          vec3 albedo = mix(uBase * 0.9, uBase * 1.1, n);

          // Triplanar window grid: more density vertically for skyscrapers
          vec3 uv3 = triplanar(vWorld * vec3(1.0, 1.5, 1.0));
          float windows = windowMask(uv3.xy, 6.0, uSeed);

          // Flicker a small subset of windows for life
          float flicker = step(0.95, fract(sin(dot(floor(uv3.xy*6.0), vec2(27.1, 61.7)) + uTime * 2.0) * 43758.5453));
          windows = clamp(windows + flicker * 0.6, 0.0, 1.0);

          // Emissive color for windows
          vec3 emissive = uGlow * (1.2 + 0.6 * noise(vWorld*0.5 + uTime)) * windows * uEmissiveBoost;

          // Simple lighting approximation (Lambert) using normal
          float nd = clamp(dot(normalize(vNormalW), normalize(vec3(0.4,0.9,0.2))), 0.0, 1.0);
          vec3 color = albedo * (0.25 + 0.75*nd);

          // Add emissive windows on top
          color += emissive;

          // Subtle AO via noise
          color *= (0.95 + 0.05 * noise(vWorld*0.8));

          // Tonemap-ish
          color = color / (color + vec3(1.0));

          gl_FragColor = vec4(color, 1.0);
        }
      `}
      transparent={false}
      lights={false}
    />
  );
}

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

  // Balanced palette for base and window glow
  const palette = useMemo(
    () => [
      { base: '#2b3340', glow: '#8ecae6' }, // cool steel + cyan glow
      { base: '#2a2f3a', glow: '#a78bfa' }, // graphite + violet
      { base: '#2c3442', glow: '#f59e0b' }, // slate + amber
      { base: '#23303a', glow: '#22d3ee' }, // deep blue + neon cyan
      { base: '#2b2b35', glow: '#f472b6' }, // charcoal + pink
      { base: '#2a3433', glow: '#34d399' }, // dark teal + emerald
    ],
    []
  );

  const boxes = useMemo(() => {
    const b = [];
    const grid = 10;
    for (let x = -grid; x <= grid; x++) {
      for (let z = -grid; z <= grid; z++) {
        const h = Math.random() * 7 + 1.6;
        const colorIdx = Math.floor(Math.random() * palette.length);
        const wobble = (Math.random() - 0.5) * 0.06;
        b.push({ position: [x * 1.6 + wobble, h / 2, z * 1.6], height: h, ci: colorIdx, boost: 0.8 + Math.random() * 1.6 });
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
        const { base, glow } = palette[b.ci];
        return (
          <mesh key={i} position={b.position} castShadow receiveShadow>
            <boxGeometry args={[1, b.height, 1]} />
            <BuildingMaterial base={base} glow={glow} emissiveBoost={b.boost} />
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
      dirCool.current.intensity = lerp(1.2, 0.5, dawn);
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
      <directionalLight ref={dirCool} position={[-6, 4, 6]} intensity={1.0} castShadow />
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
