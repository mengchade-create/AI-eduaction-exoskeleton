/* eslint-disable react-refresh/only-export-components */

export interface RigProps {
  /** Left hip pitch angle in degrees. 0 = vertical neutral. Positive = forward swing. */
  leftHipDeg?: number;
  /** Right hip pitch angle in degrees. 0 = vertical neutral. Positive = forward swing. */
  rightHipDeg?: number;
}

const HIP_ROM_LIMIT_DEG = 80;
const DEG_TO_RAD = Math.PI / 180;
const LEG_LENGTH = 0.7;
const FOOT_HEIGHT = 0.05;
const HIP_HEIGHT = LEG_LENGTH + FOOT_HEIGHT;
const HIP_OFFSET_X = 0.09;

const headColor = "#fbbf24";
const torsoColor = "#3b82f6";
const legColor = "#1e40af";
const footColor = "#374151";
const limitColor = "#dc2626";

export function clampHipDeg(deg: number): number {
  return Math.min(HIP_ROM_LIMIT_DEG, Math.max(-HIP_ROM_LIMIT_DEG, deg));
}

export function isAtRomLimit(clampedDeg: number): boolean {
  return Math.abs(clampedDeg) >= HIP_ROM_LIMIT_DEG;
}

function degToRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

interface LegProps {
  hipDeg: number;
  side: "left" | "right";
}

function Leg({ hipDeg, side }: LegProps) {
  const clampedDeg = clampHipDeg(hipDeg);
  const materialColor = isAtRomLimit(clampedDeg) ? limitColor : legColor;
  const x = side === "left" ? -HIP_OFFSET_X : HIP_OFFSET_X;

  return (
    <group position={[x, HIP_HEIGHT, 0]} rotation={[degToRad(clampedDeg), 0, 0]}>
      <mesh position={[0, -LEG_LENGTH / 2, 0]}>
        <boxGeometry args={[0.12, LEG_LENGTH, 0.12]} />
        <meshStandardMaterial color={materialColor} />
      </mesh>
      <mesh position={[0, -LEG_LENGTH - FOOT_HEIGHT / 2, -0.04]}>
        <boxGeometry args={[0.2, FOOT_HEIGHT, 0.25]} />
        <meshStandardMaterial color={footColor} />
      </mesh>
    </group>
  );
}

export default function Rig({ leftHipDeg = 0, rightHipDeg = 0 }: RigProps) {
  return (
    <group>
      <mesh position={[0, HIP_HEIGHT + 0.25, 0]}>
        <boxGeometry args={[0.3, 0.5, 0.2]} />
        <meshStandardMaterial color={torsoColor} />
      </mesh>
      <mesh position={[0, HIP_HEIGHT + 0.62, 0]}>
        <sphereGeometry args={[0.12, 24, 16]} />
        <meshStandardMaterial color={headColor} />
      </mesh>
      <Leg hipDeg={leftHipDeg} side="left" />
      <Leg hipDeg={rightHipDeg} side="right" />
    </group>
  );
}
