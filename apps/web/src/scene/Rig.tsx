/* eslint-disable react-refresh/only-export-components */

import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { DEFAULT_PASSIVE_JOINTS, type PassiveJointAngles } from "./passiveJoints";
import { computePelvisOffsetSagittal, computePelvisOffsetY, type StanceFoot } from "./grounding";
import { FOOT_BOX_HEIGHT, REST_FOOT_SAGITTAL, REST_FOOT_Y, RIG_GEOMETRY } from "./rigGeometry";

export interface RigProps {
  /** Left hip pitch angle in degrees. 0 = vertical neutral. Positive = forward swing. */
  leftHipDeg?: number;
  /** Right hip pitch angle in degrees. 0 = vertical neutral. Positive = forward swing. */
  rightHipDeg?: number;
  /** SPEC §0.1(b) passive joint · animation-only · NOT telemetry · NOT control. */
  passiveJoints?: PassiveJointAngles;
  stance?: StanceFoot;
}

const HIP_ROM_LIMIT_DEG = 80;
const DEG_TO_RAD = Math.PI / 180;
const THIGH_LENGTH = RIG_GEOMETRY.thighLength;
const SHANK_LENGTH = RIG_GEOMETRY.shinLength;
const LEG_LENGTH = THIGH_LENGTH + SHANK_LENGTH;
const HIP_HEIGHT = -REST_FOOT_Y;
const HIP_OFFSET_X = 0.09;
const TORSO_HEIGHT = 0.42;
const TORSO_CENTER_Y = HIP_HEIGHT + TORSO_HEIGHT / 2;
const SHOULDER_X = 0.19;
const SHOULDER_Y = HIP_HEIGHT + TORSO_HEIGHT - 0.13;
const ARM_LENGTH = 0.34;
const ARM_ANGLE_RAD = Math.PI / 4;
const MOTOR_OFFSET_X = 0.23;
const MOTOR_RADIUS = 0.065;
const THIGH_STRAP_Y = -LEG_LENGTH * 0.15;
const THIGH_STRAP_HEIGHT = 0.08;
const THIGH_STRAP_WIDTH = 0.15;
const ROD_RADIUS = 0.018;
const LEG_ROD_BOW_X = 0.06;

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
  kneeRad: number;
  ankleRad: number;
  side: "left" | "right";
}

function Leg({ hipDeg, kneeRad, ankleRad, side }: LegProps) {
  const clampedDeg = clampHipDeg(hipDeg);
  const materialColor = isAtRomLimit(clampedDeg) ? limitColor : legColor;
  const x = side === "left" ? -HIP_OFFSET_X : HIP_OFFSET_X;
  const name = side === "left" ? "rig-left-leg" : "rig-right-leg";
  const legRodGeometry = useMemo(() => {
    const motorX = side === "left" ? -MOTOR_OFFSET_X : MOTOR_OFFSET_X;
    const strapSideX = side === "left" ? -THIGH_STRAP_WIDTH / 2 : THIGH_STRAP_WIDTH / 2;
    const top = new THREE.Vector3(motorX - x, -MOTOR_RADIUS, 0);
    const bottom = new THREE.Vector3(strapSideX, THIGH_STRAP_Y, 0);
    const outwardBowX = side === "left" ? -LEG_ROD_BOW_X : LEG_ROD_BOW_X;
    const midpoint = new THREE.Vector3((top.x + bottom.x) / 2 + outwardBowX, (top.y + bottom.y) / 2, 0);
    const curve = new THREE.QuadraticBezierCurve3(top, midpoint, bottom);

    return new THREE.TubeGeometry(curve, 24, ROD_RADIUS, 12, false);
  }, [side, x]);

  return (
    <group name={name} position={[x, HIP_HEIGHT, 0]} rotation={[degToRad(clampedDeg), 0, 0]}>
      <mesh geometry={legRodGeometry}>
        <meshStandardMaterial color={rodColor} />
      </mesh>
      <RoundedBox args={[0.15, THIGH_STRAP_HEIGHT, 0.15]} position={[0, THIGH_STRAP_Y, 0]} radius={0.02} smoothness={3}>
        <meshStandardMaterial color={exoColor} />
      </RoundedBox>
      <RoundedBox args={[0.13, THIGH_LENGTH, 0.13]} position={[0, -THIGH_LENGTH / 2, 0]} radius={0.025} smoothness={3}>
        <meshStandardMaterial color={materialColor} />
      </RoundedBox>
      {/* SPEC §0.1(b) passive joint · animation-only · NOT telemetry · NOT control. */}
      {/* Knee flexion is positive, but this rig's local +X maps to forward swing. */}
      <group name={side === "left" ? "rig-left-knee-passive" : "rig-right-knee-passive"} position={[0, -THIGH_LENGTH, 0]} rotation={[-kneeRad, 0, 0]}>
        <RoundedBox args={[0.12, SHANK_LENGTH, 0.12]} position={[0, -SHANK_LENGTH / 2, 0]} radius={0.025} smoothness={3}>
          <meshStandardMaterial color={materialColor} />
        </RoundedBox>
        <group name={side === "left" ? "rig-left-ankle-passive" : "rig-right-ankle-passive"} position={[0, -SHANK_LENGTH, 0]} rotation={[ankleRad, 0, 0]}>
          <RoundedBox args={[0.22, FOOT_BOX_HEIGHT, 0.28]} position={[0, FOOT_BOX_HEIGHT / 2, -0.06]} radius={0.02} smoothness={3}>
            <meshStandardMaterial color={footColor} />
          </RoundedBox>
        </group>
      </group>
    </group>
  );
}

interface ArmProps {
  side: "left" | "right";
}

function Arm({ side }: ArmProps) {
  const isLeft = side === "left";
  const shoulderX = isLeft ? SHOULDER_X : -SHOULDER_X;
  const rotationZ = isLeft ? ARM_ANGLE_RAD : -ARM_ANGLE_RAD;
  const name = isLeft ? "rig-left-arm" : "rig-right-arm";

  return (
    <group name={name} position={[shoulderX, SHOULDER_Y, 0]} rotation={[0, 0, rotationZ]}>
      <mesh>
        <sphereGeometry args={[0.055, 18, 14]} />
        <meshStandardMaterial color={torsoColor} />
      </mesh>
      <RoundedBox args={[0.09, ARM_LENGTH, 0.09]} position={[0, -ARM_LENGTH / 2, 0]} radius={0.02} smoothness={3}>
        <meshStandardMaterial color={torsoColor} />
      </RoundedBox>
      <mesh position={[0, -ARM_LENGTH, 0]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshStandardMaterial color={headColor} />
      </mesh>
    </group>
  );
}

export default function Rig({
  leftHipDeg = 0,
  rightHipDeg = 0,
  passiveJoints = DEFAULT_PASSIVE_JOINTS,
  stance = "both",
}: RigProps) {
  const pelvisOffsetY = computePelvisOffsetY(
    {
      hip: degToRad(clampHipDeg(leftHipDeg)),
      knee: passiveJoints.leftKnee,
      ankle: passiveJoints.leftAnkle,
    },
    {
      hip: degToRad(clampHipDeg(rightHipDeg)),
      knee: passiveJoints.rightKnee,
      ankle: passiveJoints.rightAnkle,
    },
    stance,
    RIG_GEOMETRY,
    REST_FOOT_Y,
  );
  // sagittal forward displacement -> -Z in scene (hip rotates around X axis)
  const pelvisOffsetZ = -computePelvisOffsetSagittal(
    {
      hip: degToRad(clampHipDeg(leftHipDeg)),
      knee: passiveJoints.leftKnee,
      ankle: passiveJoints.leftAnkle,
    },
    {
      hip: degToRad(clampHipDeg(rightHipDeg)),
      knee: passiveJoints.rightKnee,
      ankle: passiveJoints.rightAnkle,
    },
    stance,
    RIG_GEOMETRY,
    REST_FOOT_SAGITTAL,
  );

  return (
    <group name="rig-grounding" position={[0, pelvisOffsetY, pelvisOffsetZ]}>
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
        <Leg ankleRad={passiveJoints.leftAnkle} hipDeg={leftHipDeg} kneeRad={passiveJoints.leftKnee} side="left" />
        <Leg ankleRad={passiveJoints.rightAnkle} hipDeg={rightHipDeg} kneeRad={passiveJoints.rightKnee} side="right" />
      </group>
    </group>
  );
}
