import { type ChangeEvent, useState } from "react";

import Rig from "../scene/Rig";
import { Scene } from "../scene";

export default function SimPage() {
  const [leftHipDeg, setLeftHipDeg] = useState(0);
  const [rightHipDeg, setRightHipDeg] = useState(0);
  const updateLeftHip = (event: ChangeEvent<HTMLInputElement>) => {
    setLeftHipDeg(Number(event.currentTarget.value));
  };
  const updateRightHip = (event: ChangeEvent<HTMLInputElement>) => {
    setRightHipDeg(Number(event.currentTarget.value));
  };

  return (
    <main className="flex h-screen flex-col bg-sky-100 text-slate-900">
      <header className="shrink-0 bg-white/80 shadow-sm">
        <h1 className="p-4 text-xl font-bold">外骨骼仿真 · Phase 2</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <section className="min-h-0 flex-[7] [&_canvas]:!h-full [&_canvas]:!w-full">
          <Scene>
            <Rig leftHipDeg={leftHipDeg} rightHipDeg={rightHipDeg} />
          </Scene>
        </section>
        <aside
          className="flex-[3] border-l border-slate-200 bg-white/90 p-4 shadow-inner"
          data-testid="dev-debug-panel"
        >
          <div className="space-y-6">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">左髋 (left hip)</span>
              <input
                className="mt-3 w-full accent-blue-600"
                max={90}
                min={-90}
                onChange={updateLeftHip}
                onInput={updateLeftHip}
                step={1}
                type="range"
                value={leftHipDeg}
              />
              <span className="mt-2 block text-sm tabular-nums text-slate-600">{leftHipDeg}°</span>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">右髋 (right hip)</span>
              <input
                className="mt-3 w-full accent-blue-600"
                max={90}
                min={-90}
                onChange={updateRightHip}
                onInput={updateRightHip}
                step={1}
                type="range"
                value={rightHipDeg}
              />
              <span className="mt-2 block text-sm tabular-nums text-slate-600">{rightHipDeg}°</span>
            </label>

            <p className="text-sm text-slate-500">这是开发调试面板,PR #14 会接入真实仿真后移除。</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
