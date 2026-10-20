import React, { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function texture(type) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d");
  let seed = 411;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  if (type === "wood") {
    c.fillStyle = "#bb9065";
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 700; i++) {
      c.strokeStyle = `rgba(${rand() > 0.5 ? "105,65,33" : "246,222,185"},${rand() * 0.14})`;
      c.lineWidth = rand() * 2;
      c.beginPath();
      let x = rand() * 512;
      c.moveTo(x, 0);
      c.bezierCurveTo(x + 12, 150, x - 9, 350, x + 4, 512);
      c.stroke();
    }
  } else {
    c.fillStyle = type === "strong" ? "#a06d43" : "#bc936a";
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      c.fillStyle = `rgba(${rand() > 0.4 ? "255,240,210" : "77,42,16"},${rand() * 0.2})`;
      c.beginPath();
      c.arc(rand() * 512, rand() * 512, rand() * 2.7, 0, Math.PI * 2);
      c.fill();
    }
    c.save();
    c.translate(256, 260);
    c.rotate(-0.35);
    c.fillStyle = "#f8edda";
    c.beginPath();
    c.moveTo(0, 117);
    c.bezierCurveTo(-30, 70, -123, -4, -118, -61);
    c.bezierCurveTo(-109, -144, -25, -138, 0, -70);
    c.bezierCurveTo(28, -142, 113, -141, 121, -66);
    c.bezierCurveTo(131, -13, 40, 81, 0, 117);
    c.fill();
    for (let i = 0; i < 5; i++) {
      c.strokeStyle = type === "strong" ? "#a97449" : "#bb9266";
      c.lineWidth = 5 - i * 0.5;
      c.beginPath();
      c.moveTo(-91 + i * 16, -65 + i * 25);
      c.quadraticCurveTo(0, 12 + i * 25, 92 - i * 16, -65 + i * 25);
      c.stroke();
    }
    c.strokeStyle = "#fff8e9";
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(0, -100);
    c.quadraticCurveTo(-7, 0, 3, 112);
    c.stroke();
    c.restore();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function Ground({ kind }) {
  const shadow = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 63);
    gradient.addColorStop(0, "rgba(77,65,40,.27)");
    gradient.addColorStop(0.4, "rgba(77,65,40,.15)");
    gradient.addColorStop(0.75, "rgba(77,65,40,.04)");
    gradient.addColorStop(1, "rgba(77,65,40,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.91, 0]}>
      <planeGeometry args={kind === "cup" ? [4, 3.5] : [2.4, 2.2]} />
      <meshBasicMaterial map={shadow} transparent depthWrite={false} />
    </mesh>
  );
}
function Steam({ reduced }) {
  const ref = useRef();
  const curves = useMemo(
    () =>
      [0, 1, 2].map(
        (i) =>
          new THREE.CatmullRomCurve3(
            Array.from(
              { length: 18 },
              (_, j) =>
                new THREE.Vector3(
                  Math.sin(j * 0.35 + i) * 0.07 + (i - 1) * 0.2,
                  j * 0.075,
                  Math.cos(j * 0.3 + i) * 0.06,
                ),
            ),
          ),
      ),
    [],
  );
  useFrame(({ clock }) => {
    if (ref.current && !reduced) {
      ref.current.position.y = 0.67 + Math.sin(clock.elapsedTime * 0.7) * 0.04;
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.2;
    }
  });
  return (
    <group ref={ref} position={[0, 0.7, 0]}>
      {curves.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 32, 0.011, 6, false]} />
          <meshBasicMaterial
            color="#a59c8a"
            transparent
            opacity={0.13 - i * 0.02}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
function Cup({ strength, phase, reduced, rotation }) {
  const ref = useRef();
  const liquid = useRef();
  const foamSurface = useRef();
  const stream = useRef();
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [phase]);
  const foam = useMemo(
    () => texture(strength === "Strong" ? "strong" : "foam"),
    [strength],
  );
  const profile = useMemo(
    () => [
      new THREE.Vector2(0, -0.72),
      new THREE.Vector2(0.43, -0.72),
      new THREE.Vector2(0.52, -0.68),
      new THREE.Vector2(0.67, -0.49),
      new THREE.Vector2(0.79, -0.16),
      new THREE.Vector2(0.84, 0.3),
      new THREE.Vector2(0.85, 0.5),
      new THREE.Vector2(0.82, 0.54),
      new THREE.Vector2(0.77, 0.52),
      new THREE.Vector2(0.76, 0.3),
      new THREE.Vector2(0.7, -0.2),
      new THREE.Vector2(0.54, -0.53),
      new THREE.Vector2(0, -0.57),
    ],
    [],
  );
  useFrame((_state, delta) => {
    elapsed.current += delta;
    const progress = Math.min(
      1,
      elapsed.current / (reduced ? 0.15 : phase === "espresso" ? 1.5 : 1.7),
    );
    const level =
      phase === "espresso"
        ? -0.42 + progress * 0.4
        : phase === "milk"
          ? -0.02 + progress * 0.455
          : 0.435;
    if (liquid.current) {
      liquid.current.position.y = level;
      liquid.current.scale.setScalar(
        phase === "espresso" ? 0.76 + progress * 0.2 : 1,
      );
    }
    if (foamSurface.current) {
      foamSurface.current.position.y = level + 0.013;
      foamSurface.current.scale.setScalar(
        phase === "milk" ? 0.05 + progress * 0.95 : 1,
      );
    }
    if (stream.current) {
      stream.current.position.y = (3 + level) / 2;
      stream.current.scale.y = (3 - level) / 2.6;
    }
    if (ref.current) {
      ref.current.rotation.y = THREE.MathUtils.lerp(
        ref.current.rotation.y,
        rotation.current.x,
        0.08,
      );
      ref.current.rotation.x = THREE.MathUtils.lerp(
        ref.current.rotation.x,
        rotation.current.y,
        0.08,
      );
    }
  });
  const pouring = phase === "espresso" || phase === "milk";
  return (
    <group ref={ref} position={[-0.12, 0, 0]} rotation={[0, -0.2, 0]}>
      <mesh position={[0, -0.8, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.38, 1.23, 0.1, 80]} />
        <meshStandardMaterial color="#e8e5d5" roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.735, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.91, 0.023, 12, 80]} />
        <meshStandardMaterial color="#dbd9c7" roughness={0.4} />
      </mesh>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[profile, 80]} />
        <meshStandardMaterial
          color="#efeee2"
          roughness={0.24}
          metalness={0.03}
        />
      </mesh>
      <mesh
        position={[0.91, -0.02, 0]}
        scale={[0.8, 1, 1]}
        castShadow
        rotation={[0, 0, -0.13]}
      >
        <torusGeometry args={[0.4, 0.12, 20, 64]} />
        <meshStandardMaterial color="#eae9db" roughness={0.25} />
      </mesh>
      <mesh
        ref={liquid}
        position={[0, 0.435, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.768, 80]} />
        <meshStandardMaterial
          color={phase === "espresso" ? "#492b1e" : "#8a5734"}
          roughness={0.27}
        />
      </mesh>
      {phase !== "espresso" && (
        <mesh
          ref={foamSurface}
          position={[0, 0.448, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={phase === "milk" ? [0.65, 0.65, 0.65] : [1, 1, 1]}
        >
          <circleGeometry args={[0.746, 80]} />
          <meshStandardMaterial map={foam} roughness={0.66} />
        </mesh>
      )}
      {!pouring && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.458, 0]}>
          <torusGeometry args={[0.755, 0.014, 10, 80]} />
          <meshStandardMaterial
            color={strength === "Strong" ? "#744523" : "#b68a50"}
          />
        </mesh>
      )}
      {pouring && (
        <mesh ref={stream} position={[0.05, 1.8, 0.01]}>
          <cylinderGeometry
            args={[
              phase === "milk" ? 0.042 : 0.022,
              phase === "milk" ? 0.06 : 0.03,
              2.6,
              16,
            ]}
          />
          <meshStandardMaterial
            color={phase === "milk" ? "#f8f0dc" : "#54321e"}
            roughness={0.35}
          />
        </mesh>
      )}
      {!pouring && <Steam reduced={reduced} />}
    </group>
  );
}
const sticks = Array.from({ length: 19 }, (_, i) => ({
  x: Math.cos(i * 2.4) * (0.13 + (i % 4) * 0.13),
  z: Math.sin(i * 2.4) * (0.13 + (i % 4) * 0.13),
  h: 1.7 + (i % 5) * 0.11,
  angle: ((i % 5) - 2) * 0.052,
}));
function Holder({ drawing, drawn, reduced }) {
  const ref = useRef();
  const special = useRef();
  const wood = useMemo(() => texture("wood"), []);
  const profile = useMemo(
    () => [
      new THREE.Vector2(0, -0.83),
      new THREE.Vector2(0.47, -0.83),
      new THREE.Vector2(0.53, -0.77),
      new THREE.Vector2(0.57, 0.52),
      new THREE.Vector2(0.56, 0.57),
      new THREE.Vector2(0.49, 0.57),
      new THREE.Vector2(0.46, -0.68),
      new THREE.Vector2(0, -0.68),
    ],
    [],
  );
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z =
        drawing && !reduced
          ? Math.sin(clock.elapsedTime * 32) * 0.085
          : THREE.MathUtils.lerp(ref.current.rotation.z, 0, 0.12);
      ref.current.rotation.x =
        drawing && !reduced ? Math.sin(clock.elapsedTime * 22) * 0.04 : 0;
    }
    if (special.current)
      special.current.position.y = THREE.MathUtils.lerp(
        special.current.position.y,
        drawn ? 0.9 : 0,
        0.045,
      );
  });
  return (
    <group ref={ref} rotation={[0, -0.25, 0]}>
      {sticks.map((s, i) => (
        <group key={i} ref={i === 9 ? special : undefined}>
          <mesh
            position={[s.x, s.h / 2 - 0.32, s.z]}
            rotation={[s.angle, 0, s.angle]}
            castShadow
          >
            <boxGeometry args={[0.075, s.h, 0.035]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? "#b1854e" : "#d3b27f"}
              roughness={0.85}
            />
          </mesh>
          {i === 9 && (
            <mesh
              position={[s.x, s.h - 0.48, s.z + 0.023]}
              rotation={[0, 0, s.angle]}
            >
              <boxGeometry args={[0.077, 0.16, 0.012]} />
              <meshStandardMaterial color="#79865c" />
            </mesh>
          )}
        </group>
      ))}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[profile, 64]} />
        <meshStandardMaterial map={wood} roughness={0.67} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.565, 0]}>
        <torusGeometry args={[0.525, 0.035, 12, 64]} />
        <meshStandardMaterial color="#c4a377" roughness={0.65} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.74, 0]}>
        <torusGeometry args={[0.515, 0.02, 8, 64]} />
        <meshStandardMaterial color="#a17b52" />
      </mesh>
      <mesh position={[0, -0.12, 0.56]} rotation={[-0.04, 0, 0]}>
        <circleGeometry args={[0.19, 40]} />
        <meshStandardMaterial color="#d8bd94" roughness={1} />
      </mesh>
      <mesh position={[0, -0.12, 0.565]}>
        <boxGeometry args={[0.018, 0.15, 0.008]} />
        <meshStandardMaterial color="#94754b" />
      </mesh>
      <mesh position={[0, -0.12, 0.57]} rotation={[0, 0, 0.8]}>
        <boxGeometry args={[0.11, 0.014, 0.008]} />
        <meshStandardMaterial color="#94754b" />
      </mesh>
    </group>
  );
}
class SceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function availableGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
function Fallback({ kind }) {
  return kind === "cup" ? (
    <div className="fallback-cup">
      <div className="fallback-handle" />
      <div className="fallback-coffee">♡</div>
    </div>
  ) : (
    <div className="fallback-holder">
      {sticks.slice(0, 10).map((s, i) => (
        <i
          key={i}
          style={{
            left: `${10 + i * 8}%`,
            height: 100 + (i % 3) * 10,
            transform: `rotate(${i * 3 - 13}deg)`,
          }}
        />
      ))}
      <span>✧</span>
    </div>
  );
}
function ObjectCamera({ kind, drawn, reduced }) {
  const { camera, size } = useThree();
  const target = useRef({ zoom: 80, y: 0 });
  const lookY = useRef(0);
  useEffect(() => {
    target.current = {
      zoom: Math.min(
        kind === "cup" ? 85 : 80,
        size.height / (drawn ? 4.6 : 3.6),
        size.width / 3.7,
      ),
      y: drawn ? 0.35 : 0,
    };
  }, [camera, kind, drawn, size.width, size.height]);
  useFrame(() => {
    camera.zoom = THREE.MathUtils.lerp(
      camera.zoom,
      target.current.zoom,
      reduced ? 1 : 0.12,
    );
    lookY.current = THREE.MathUtils.lerp(
      lookY.current,
      target.current.y,
      reduced ? 1 : 0.12,
    );
    camera.lookAt(0, lookY.current, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}
export default function DeskObject({
  kind,
  strength,
  phase,
  drawing,
  drawn,
  reduced,
}) {
  const [gl] = useState(availableGL);
  const rotation = useRef({ x: -0.18, y: 0 });
  const drag = useRef(null);
  const fallback = <Fallback kind={kind} />;
  return (
    <div
      className={`object-canvas ${kind}`}
      onPointerDown={(e) => {
        if (kind !== "cup") return;
        drag.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (kind !== "cup" || reduced) return;
        if (drag.current) {
          rotation.current = {
            x: Math.max(
              -0.8,
              Math.min(0.8, (e.clientX - drag.current.x) * 0.008),
            ),
            y: Math.max(
              -0.16,
              Math.min(0.2, (e.clientY - drag.current.y) * 0.004),
            ),
          };
        } else {
          const b = e.currentTarget.getBoundingClientRect();
          rotation.current = {
            x: (e.clientX - b.left - b.width / 2) * 0.001,
            y: 0,
          };
        }
      }}
      onPointerUp={() => {
        drag.current = null;
        rotation.current = { x: -0.18, y: 0 };
      }}
      onPointerCancel={() => {
        drag.current = null;
        rotation.current = { x: -0.18, y: 0 };
      }}
      onPointerLeave={() => {
        if (!drag.current) rotation.current = { x: -0.18, y: 0 };
      }}
      aria-hidden="true"
    >
      {gl ? (
        <SceneBoundary fallback={fallback}>
          <Canvas
            shadows
            dpr={[1, 1.7]}
            orthographic
            camera={{
              position: [3, 3.3, 6],
              zoom: kind === "cup" ? 85 : 80,
              near: 0.1,
              far: 100,
            }}
            gl={{ alpha: true, antialias: true }}
          >
            <ObjectCamera kind={kind} drawn={drawn} reduced={reduced} />
            <ambientLight intensity={1.7} />
            <directionalLight
              position={[-3, 7, 4]}
              intensity={3.4}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-4}
              shadow-camera-right={4}
              shadow-camera-top={5}
              shadow-camera-bottom={-4}
              shadow-bias={-0.0005}
            />
            <directionalLight position={[4, 3, -3]} intensity={0.7} />
            <Suspense fallback={null}>
              {kind === "cup" ? (
                <Cup {...{ strength, phase, reduced, rotation }} />
              ) : (
                <Holder {...{ drawing, drawn, reduced }} />
              )}
              <Ground kind={kind} />
            </Suspense>
          </Canvas>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
