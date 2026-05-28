import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { squatTemplate } from "../anim/templates/squat";
import { useActionPlayer } from "../anim/useActionPlayer";
import QRefVsQChart from "../components/sim/QRefVsQChart";
import StaminaBar from "../components/sim/StaminaBar";
import Rig from "../scene/Rig";
import { Scene } from "../scene";
import { DEFAULT_PASSIVE_JOINTS, setPassiveJoint, type PassiveJointAngles, type PassiveJointName } from "../scene/passiveJoints";
import { SESSION_DEFAULT_STEP_MS, SimulationSession } from "../simulation/SimulationSession";
import type { TelemetryFrame } from "../simulation/types";

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const TELEMETRY_BUFFER_SIZE = 300;
const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;

type TelemetryChartPoint = {
  frame: number;
  timestamp: number;
  leftHipDeg: number;
};

function radToDeg(rad: number): number {
  return Math.round(rad * RAD_TO_DEG);
}

function toTelemetryChartPoint(frame: TelemetryFrame, frameIndex: number): TelemetryChartPoint {
  return {
    frame: frameIndex,
    timestamp: frame.timestamp,
    leftHipDeg: frame.joints.left_hip,
  };
}

export default function SimPage() {
  const [leftHipDeg, setLeftHipDeg] = useState(0);
  const [rightHipDeg, setRightHipDeg] = useState(0);
  const [telemetryHipOffset, setTelemetryHipOffset] = useState(0);
  const [telemetryFrames, setTelemetryFrames] = useState<TelemetryFrame[]>([]);
  const sessionRef = useRef<SimulationSession | null>(null);
  const wasPlayingRef = useRef(false);
  // SPEC §0.1(b) passive joint · animation-only · NOT telemetry · NOT control.
  const [passiveJoints, setPassiveJoints] = useState<PassiveJointAngles>(DEFAULT_PASSIVE_JOINTS);
  const { currentFrame, isPlaying, play, stop } = useActionPlayer(squatTemplate);
  // SPEC §3.2 / §3.5.2: active hip channel is sampled separately from telemetry/control-loop state.
  const renderedLeftHipDeg = isPlaying ? currentFrame.active.left_hip : leftHipDeg;
  const renderedRightHipDeg = isPlaying ? currentFrame.active.right_hip : rightHipDeg;
  // SPEC §0.1(b): passive channel is animation-only and never enters telemetry or control.
  const renderedPassiveJoints = isPlaying ? currentFrame.passive : passiveJoints;
  const renderedStance = isPlaying ? currentFrame.stance : "both";
  const telemetryPoints = useMemo(
    () => telemetryFrames.map((frame, index) => toTelemetryChartPoint(frame, index + 1)),
    [telemetryFrames],
  );
  const latestTelemetryFrame = telemetryFrames[telemetryFrames.length - 1];
  const updateLeftHip = (event: ChangeEvent<HTMLInputElement>) => {
    setLeftHipDeg(Number(event.currentTarget.value));
  };
  const updateRightHip = (event: ChangeEvent<HTMLInputElement>) => {
    setRightHipDeg(Number(event.currentTarget.value));
  };
  const updatePassiveJoint = (joint: PassiveJointName) => (event: ChangeEvent<HTMLInputElement>) => {
    const valueRad = Number(event.currentTarget.value) * DEG_TO_RAD;

    setPassiveJoints((current) => setPassiveJoint(current, joint, valueRad));
  };
  useEffect(() => {
    const session = new SimulationSession({ initialAction: "walk" });
    sessionRef.current = session;
    const unsubscribe = session.onTelemetry((frame) => {
      setTelemetryHipOffset(frame.joints.left_hip);

      setTelemetryFrames((current) => {
        const next = current.length >= TELEMETRY_BUFFER_SIZE
          ? current.slice(current.length - TELEMETRY_BUFFER_SIZE + 1)
          : [...current];
        next.push(frame);
        return next;
      });
    });

    session.start();
    const intervalId = window.setInterval(() => {
      session.step(SESSION_DEFAULT_STEP_MS);
    }, SESSION_DEFAULT_STEP_MS);

    return () => {
      window.clearInterval(intervalId);
      unsubscribe();

      if (session.getState() === "running" || session.getState() === "paused") {
        session.stop();
      }
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (wasPlayingRef.current && !isPlaying) {
      sessionRef.current?.setAction("walk");
    }

    wasPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const toggleSquatPlayback = () => {
    setLeftHipDeg(0);
    setRightHipDeg(0);
    setPassiveJoints(DEFAULT_PASSIVE_JOINTS);

    if (isPlaying) {
      sessionRef.current?.setAction("walk");
      stop();
      return;
    }

    sessionRef.current?.setAction("squat");
    play();
  };
  const passiveSlider = (label: string, joint: PassiveJointName, min: number, max: number) => (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm font-semibold text-slate-700">
        {label}
        <span className="text-xs font-normal text-slate-500">passive · animation-only</span>
      </span>
      <input
        className="mt-3 w-full accent-orange-500"
        disabled={isPlaying}
        max={max}
        min={min}
        onChange={updatePassiveJoint(joint)}
        onInput={updatePassiveJoint(joint)}
        step={1}
        type="range"
        value={radToDeg(renderedPassiveJoints[joint])}
      />
      <span className="mt-2 block text-sm tabular-nums text-slate-600">{radToDeg(renderedPassiveJoints[joint])}°</span>
    </label>
  );

  return (
    <main className="flex h-screen flex-col bg-sky-100 text-slate-900">
      <header className="shrink-0 bg-white/80 shadow-sm">
        <h1 className="p-4 text-xl font-bold">外骨骼仿真 · Phase 2</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <section className="min-h-0 flex-[7] [&_canvas]:!h-full [&_canvas]:!w-full">
          <Scene>
            <Rig
              leftHipDeg={renderedLeftHipDeg}
              passiveJoints={renderedPassiveJoints}
              rightHipDeg={renderedRightHipDeg}
              stance={renderedStance}
              telemetryHipOffset={telemetryHipOffset}
            />
          </Scene>
        </section>
        {isDev ? (
          <aside
            className="flex-[3] overflow-y-auto border-l border-slate-200 bg-white/90 p-4 shadow-inner"
            data-testid="dev-debug-panel"
          >
            <div className="space-y-6">
              <button
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                data-testid="play-squat-btn"
                onClick={toggleSquatPlayback}
                type="button"
              >
                {isPlaying ? "Stop" : "Play squat"}
              </button>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">左髋 (left hip)</span>
                <input
                  className="mt-3 w-full accent-blue-600"
                  disabled={isPlaying}
                  max={90}
                  min={-90}
                  onChange={updateLeftHip}
                  onInput={updateLeftHip}
                  step={1}
                  type="range"
                  value={renderedLeftHipDeg}
                />
                <span className="mt-2 block text-sm tabular-nums text-slate-600">{Math.round(renderedLeftHipDeg)}°</span>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">右髋 (right hip)</span>
                <input
                  className="mt-3 w-full accent-blue-600"
                  disabled={isPlaying}
                  max={90}
                  min={-90}
                  onChange={updateRightHip}
                  onInput={updateRightHip}
                  step={1}
                  type="range"
                  value={renderedRightHipDeg}
                />
                <span className="mt-2 block text-sm tabular-nums text-slate-600">{Math.round(renderedRightHipDeg)}°</span>
              </label>

              {/* SPEC §0.1(b) passive joint · animation-only · NOT telemetry · NOT control. */}
              <div className="space-y-6 border-t border-slate-200 pt-5">
                {passiveSlider("左膝 (L_knee)", "leftKnee", 0, 150)}
                {passiveSlider("右膝 (R_knee)", "rightKnee", 0, 150)}
                {passiveSlider("左踝 (L_ankle)", "leftAnkle", -40, 30)}
                {passiveSlider("右踝 (R_ankle)", "rightAnkle", -40, 30)}
              </div>

              <p className="text-sm text-slate-500">这是开发调试面板,PR #14 会接入真实仿真后移除。</p>
              <div className="space-y-4 border-t border-slate-200 pt-5">
                <QRefVsQChart frames={telemetryFrames} />
                <StaminaBar frame={latestTelemetryFrame} />
              </div>
              <div className="border-t border-slate-200 pt-5">
                <p className="text-sm font-semibold text-slate-700">Raw telemetry: left hip angle</p>
                <div className="mt-3 h-48">
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={telemetryPoints}>
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Line dataKey="leftHipDeg" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
