/* eslint-disable react-refresh/only-export-components */

import { RoundedBox } from "@react-three/drei";

export interface RigProps {
  /** Left hip pitch angle in degrees. 0 = vertical neutral. Positive = forward swing. */
  leftHipDeg?: number;
  /** Right hip pitch angle in degrees. 0 = vertical neutral. Positive = forward swing. */
  rightHipDeg?: number;
}

const HIP_ROM_LIMIT_DEG = 80;
const DEG_TO_RAD = Math.PI / 180;
const LEG_LENGTH = 0.62;
const FOOT_HEIGHT = 0.06;
const HIP_HEIGHT = LEG_LENGTH;
const HIP_OFFSET_X = 0.09;
const TORSO_HEIGHT = 0.42;
const TORSO_CENTER_Y = HIP_HEIGHT + TORSO_HEIGHT / 2;
const SHOULDER_Y = HIP_HEIGHT + TORSO_HEIGHT - 0.08;
const UPPER_ARM_LENGTH = 0.3;
const FOREARM_LENGTH = 0.22;
const MOTOR_OFFSET_X = 0.23;
const THIGH_STRAP_Y = -LEG_LENGTH * 0.15;
const THIGH_STRAP_HEIGHT = 0.08;
const ROD_A_LENGTH = 0.1;
const ROD_B_LENGTH = 0.13;
const ROD_RADIUS = 0.018;

const headColor = "#fde68a";
const torsoColor = "#3b82f6";
const legColor = "#1e3a8a";
const footColor = "#374151";
const exoColor = "#fb923c";
const motorColor = "#525252";
const limitColor = "#dc2626";
const rodColor = "#dc2626";

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
  const rodX = side === "left" ? -0.055 : 0.055;
  const name = side === "left" ? "rig-left-leg" : "rig-right-leg";

  return (
    <group name={name} position={[x, HIP_HEIGHT, 0]} rotation={[degToRad(clampedDeg), 0, 0]}>
      <mesh position={[rodX, -ROD_B_LENGTH / 2, 0]}>
        <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, ROD_B_LENGTH, 12]} />
        <meshStandardMaterial color={rodColor} />
      </mesh>
      <RoundedBox args={[0.15, THIGH_STRAP_HEIGHT, 0.15]} position={[0, THIGH_STRAP_Y, 0]} radius={0.02} smoothness={3}>
        <meshStandardMaterial color={exoColor} />
      </RoundedBox>
      <RoundedBox args={[0.13, LEG_LENGTH, 0.13]} position={[0, -LEG_LENGTH / 2, 0]} radius={0.025} smoothness={3}>
        <meshStandardMaterial color={materialColor} />
      </RoundedBox>
      <RoundedBox args={[0.22, FOOT_HEIGHT, 0.28]} position={[0, -LEG_LENGTH + FOOT_HEIGHT / 2, -0.06]} radius={0.02} smoothness={3}>
        <meshStandardMaterial color={footColor} />
      </RoundedBox>
    </group>
  );
}

interface ArmProps {
  side: "left" | "right";
}

function Arm({ side }: ArmProps) {
  const isLeft = side === "left";
  const x = isLeft ? -0.21 : 0.21;
  const forearmRotationZ = isLeft ? Math.PI / 2 - 0.15 : -(Math.PI / 2 - 0.15);
  const name = isLeft ? "rig-left-arm" : "rig-right-arm";

  return (
    <group name={name} position={[x, SHOULDER_Y, 0]}>
      <RoundedBox args={[0.1, UPPER_ARM_LENGTH, 0.1]} position={[0, -UPPER_ARM_LENGTH / 2, 0]} radius={0.025} smoothness={3}>
        <meshStandardMaterial color={torsoColor} />
      </RoundedBox>
      <group position={[0, -UPPER_ARM_LENGTH, 0]}>
        <mesh>
          <sphereGeometry args={[0.055, 18, 12]} />
          <meshStandardMaterial color={torsoColor} />
        </mesh>
        <group rotation={[0, 0, forearmRotationZ]}>
          <RoundedBox args={[0.09, FOREARM_LENGTH, 0.09]} position={[0, FOREARM_LENGTH / 2, 0]} radius={0.022} smoothness={3}>
            <meshStandardMaterial color={torsoColor} />
          </RoundedBox>
          <mesh position={[0, FOREARM_LENGTH, 0]}>
            <sphereGeometry args={[0.07, 20, 14]} />
            <meshStandardMaterial color={headColor} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

interface BodyRodProps {
  side: "left" | "right";
}

function BodyRod({ side }: BodyRodProps) {
  const x = side === "left" ? -MOTOR_OFFSET_X : MOTOR_OFFSET_X;

  return (
    <mesh name={side === "left" ? "rig-left-belt-motor-rod" : "rig-right-belt-motor-rod"} position={[x, HIP_HEIGHT + 0.08, 0]}>
      <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, ROD_A_LENGTH, 12]} />
      <meshStandardMaterial color={rodColor} />
    </mesh>
  );
}

export default function Rig({ leftHipDeg = 0, rightHipDeg = 0 }: RigProps) {
  return (
    <group name="rig-root">
      <group name="rig-upper">
        <RoundedBox args={[0.32, TORSO_HEIGHT, 0.22]} position={[0, TORSO_CENTER_Y, 0]} radius={0.04} smoothness={3}>
          <meshStandardMaterial color={torsoColor} />
        </RoundedBox>
        <mesh position={[0, HIP_HEIGHT + TORSO_HEIGHT + 0.14, 0]}>
          <sphereGeometry args={[0.16, 28, 18]} />
          <meshStandardMaterial color={headColor} />
        </mesh>
        <RoundedBox args={[0.36, 0.09, 0.24]} position={[0, HIP_HEIGHT + 0.045, 0]} radius={0.025} smoothness={3}>
          <meshStandardMaterial color={exoColor} />
        </RoundedBox>
        <BodyRod side="left" />
        <BodyRod side="right" />
        <mesh name="motor-left" position={[-MOTOR_OFFSET_X, HIP_HEIGHT, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ role: "motor-left" }}>
          <cylinderGeometry args={[0.065, 0.065, 0.1, 16]} />
          <meshStandardMaterial color={motorColor} />
        </mesh>
        <mesh name="motor-right" position={[MOTOR_OFFSET_X, HIP_HEIGHT, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ role: "motor-right" }}>
          <cylinderGeometry args={[0.065, 0.065, 0.1, 16]} />
          <meshStandardMaterial color={motorColor} />
        </mesh>
        <Arm side="left" />
        <Arm side="right" />
      </group>
      <Leg hipDeg={leftHipDeg} side="left" />
      <Leg hipDeg={rightHipDeg} side="right" />
    </group>
  );
}
