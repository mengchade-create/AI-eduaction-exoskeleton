import { BAD_DEMO_PRESET, type BadDemoPreset } from "./badDemoPreset";

export interface BadDemoButtonProps {
  onApply: (preset: BadDemoPreset) => void;
}

export default function BadDemoButton({ onApply }: BadDemoButtonProps) {
  return (
    <button
      className="w-full rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
      data-testid="bad-demo-btn"
      onClick={() => onApply(BAD_DEMO_PRESET)}
      type="button"
    >
      Bad Demo
    </button>
  );
}
