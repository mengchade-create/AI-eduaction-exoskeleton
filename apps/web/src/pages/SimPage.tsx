import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import ActionButtonGroup, { type SimActionButtonAction } from "../components/sim/ActionButtonGroup";
import AdversarialModeFrame from "../components/sim/AdversarialModeFrame";
import BadDemoButton from "../components/sim/BadDemoButton";
import type { BadDemoPreset } from "../components/sim/badDemoPreset";
import QRefVsQChart from "../components/sim/QRefVsQChart";
import StaminaBar from "../components/sim/StaminaBar";
import StrategyLevelSelect from "../components/sim/StrategyLevelSelect";
import TauChart from "../components/sim/TauChart";
import Rig from "../scene/Rig";
import { Scene } from "../scene";
import { DEFAULT_PASSIVE_JOINTS, setPassiveJoint, type PassiveJointAngles, type PassiveJointName } from "../scene/passiveJoints";
import { SESSION_DEFAULT_STEP_MS, SimulationSession } from "../simulation/SimulationSession";
import type { StrategyKey } from "../simulation/strategies/Strategy";
import type { TelemetryFrame, Unsubscribe } from "../simulation/types";
import { selectSimRigFrame } from "./simRigFrame";

type MainStrategyKey = 1 | 2 | 3 | 4 | 5;

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const TELEMETRY_BUFFER_SIZE = 300;
const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;

type SimSessionConfig = {
  seed: number;
  strategyKey: StrategyKey;
  action: SimActionButtonAction;
  durationS: number | null;
};

const DEFAULT_SIM_SESSION_CONFIG: SimSessionConfig = {
  seed: 0,
  strategyKey: 1,
  action: "stand",
  durationS: null,
};

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
  const [strategyKey, setStrategyKey] = useState<StrategyKey>(1);
  const [mainStrategyKey, setMainStrategyKey] = useState<MainStrategyKey>(1);
  const [activeAction, setActiveAction] = useState<SimActionButtonAction>(DEFAULT_SIM_SESSION_CONFIG.action);
  const [activeActionStartedAtS, setActiveActionStartedAtS] = useState(0);
  const [simSeed, setSimSeed] = useState(DEFAULT_SIM_SESSION_CONFIG.seed);
  const [simDurationS, setSimDurationS] = useState<number | null>(DEFAULT_SIM_SESSION_CONFIG.durationS);
  const sessionRef = useRef<SimulationSession | null>(null);
  const sessionIntervalRef = useRef<number | null>(null);
  const unsubscribeTelemetryRef = useRef<Unsubscribe | null>(null);
  // SPEC §0.1(b) passive joint · animation-only · NOT telemetry · NOT control.
  const [passiveJoints, setPassiveJoints] = useState<PassiveJointAngles>(DEFAULT_PASSIVE_JOINTS);
  // SPEC §3.2 / §3.5.2: active hip channel is sampled separately from telemetry/control-loop state.
  // SPEC §0.1(b): passive channel is animation-only and never enters telemetry or control.
  const telemetryPoints = useMemo(
    () => telemetryFrames.map((frame, index) => toTelemetryChartPoint(frame, index + 1)),
    [telemetryFrames],
  );
  const latestTelemetryFrame = telemetryFrames[telemetryFrames.length - 1];
  const renderedRigFrame = selectSimRigFrame(activeAction, latestTelemetryFrame, {
    leftHipDeg,
    rightHipDeg,
    passiveJoints,
  }, Math.max(0, (latestTelemetryFrame?.t ?? 0) - activeActionStartedAtS));
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

  const stopSession = useCallback(() => {
    if (sessionIntervalRef.current !== null) {
      window.clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }

    unsubscribeTelemetryRef.current?.();
    unsubscribeTelemetryRef.current = null;

    const session = sessionRef.current;
    if (session !== null && (session.getState() === "running" || session.getState() === "paused")) {
      session.stop();
    }

    sessionRef.current = null;
  }, []);

  const startSession = useCallback((config: SimSessionConfig) => {
    stopSession();
    setTelemetryHipOffset(0);
    setTelemetryFrames([]);

    const session = new SimulationSession({
      seed: config.seed,
      initialAction: config.action,
      initialStrategyLevel: config.strategyKey,
    });
    sessionRef.current = session;

    unsubscribeTelemetryRef.current = session.onTelemetry((frame) => {
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
    sessionIntervalRef.current = window.setInterval(() => {
      if (session.getState() === "running") {
        session.step(SESSION_DEFAULT_STEP_MS);
      }
    }, SESSION_DEFAULT_STEP_MS);
  }, [stopSession]);

  const updateStrategyKey = (key: StrategyKey) => {
    setStrategyKey(key);

    if (key === 1 || key === 2 || key === 3 || key === 4 || key === 5) {
      setMainStrategyKey(key);
    }

    sessionRef.current?.setStrategyLevel(key);
  };

  const updateAction = (action: SimActionButtonAction) => {
    const nextStrategyKey = mainStrategyKey;

    setLeftHipDeg(0);
    setRightHipDeg(0);
    setPassiveJoints(DEFAULT_PASSIVE_JOINTS);
    setStrategyKey(nextStrategyKey);
    setActiveAction(action);
    setActiveActionStartedAtS(latestTelemetryFrame?.t ?? 0);
    setSimDurationS(null);
    sessionRef.current?.setStrategyLevel(nextStrategyKey);
    sessionRef.current?.setAction(action);
  };

  useEffect(() => {
    startSession(DEFAULT_SIM_SESSION_CONFIG);

    return () => {
      stopSession();
    };
  }, [startSession, stopSession]);

  const applyBadDemoPreset = (preset: BadDemoPreset) => {
    setLeftHipDeg(0);
    setRightHipDeg(0);
    setPassiveJoints(DEFAULT_PASSIVE_JOINTS);
    setStrategyKey(preset.strategyKey);
    setActiveAction(preset.action);
    setActiveActionStartedAtS(0);
    setSimSeed(preset.seed);
    setSimDurationS(preset.durationS);
    startSession({
      seed: preset.seed,
      strategyKey: preset.strategyKey,
      action: preset.action,
      durationS: preset.durationS,
    });
  };

  const passiveSlider = (label: string, joint: PassiveJointName, min: number, max: number) => (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm font-semibold text-slate-700">
        {label}
        <span className="text-xs font-normal text-slate-500">passive · animation-only</span>
      </span>
      <input
        className="mt-3 w-full accent-orange-500"
        disabled={activeAction !== "stand"}
        max={max}
        min={min}
        onChange={updatePassiveJoint(joint)}
        onInput={updatePassiveJoint(joint)}
        step={1}
        type="range"
        value={radToDeg(renderedRigFrame.passiveJoints[joint])}
      />
      <span className="mt-2 block text-sm tabular-nums text-slate-600">{radToDeg(renderedRigFrame.passiveJoints[joint])}°</span>
    </label>
  );

  return (
    <AdversarialModeFrame strategyKey={strategyKey}>
      <header className="shrink-0 bg-white/80 shadow-sm">
        <h1 className="p-4 text-xl font-bold">外骨骼仿真 · Phase 2</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <section className="min-h-0 flex-[7] [&_canvas]:!h-full [&_canvas]:!w-full">
          <Scene>
            <Rig
              leftHipDeg={renderedRigFrame.leftHipDeg}
              passiveJoints={renderedRigFrame.passiveJoints}
              rightHipDeg={renderedRigFrame.rightHipDeg}
              stance={renderedRigFrame.stance}
              telemetryHipOffset={telemetryHipOffset}
              groundingResetKey={`${activeAction}:${activeActionStartedAtS}:${simSeed}:${simDurationS ?? "continuous"}`}
            />
          </Scene>
        </section>
        {isDev ? (
          <aside
            className="flex-[3] overflow-y-auto border-l border-slate-200 bg-white/90 p-4 shadow-inner"
            data-testid="dev-debug-panel"
          >
            <div className="space-y-6">
              <ActionButtonGroup activeAction={activeAction} onAction={updateAction} />

              <BadDemoButton onApply={applyBadDemoPreset} />

              <StrategyLevelSelect
                isAdversarialActive={strategyKey === "bad_phase"}
                onChange={updateStrategyKey}
                value={mainStrategyKey}
              />

              <p className="text-xs text-slate-500" data-testid="sim-config-summary">
                Seed {simSeed} / Duration {simDurationS === null ? "continuous" : `${simDurationS}s`}
              </p>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">左髋 (left hip)</span>
                <input
                  className="mt-3 w-full accent-blue-600"
                  disabled={activeAction !== "stand"}
                  max={90}
                  min={-90}
                  onChange={updateLeftHip}
                  onInput={updateLeftHip}
                  step={1}
                  type="range"
                  value={renderedRigFrame.leftHipDeg}
                />
                <span className="mt-2 block text-sm tabular-nums text-slate-600">{Math.round(renderedRigFrame.leftHipDeg)}°</span>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">右髋 (right hip)</span>
                <input
                  className="mt-3 w-full accent-blue-600"
                  disabled={activeAction !== "stand"}
                  max={90}
                  min={-90}
                  onChange={updateRightHip}
                  onInput={updateRightHip}
                  step={1}
                  type="range"
                  value={renderedRigFrame.rightHipDeg}
                />
                <span className="mt-2 block text-sm tabular-nums text-slate-600">{Math.round(renderedRigFrame.rightHipDeg)}°</span>
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
                <TauChart frames={telemetryFrames} />
                <StaminaBar frames={telemetryFrames} />
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
    </AdversarialModeFrame>
  );
}
