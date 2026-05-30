import type { ActionTemplateId } from "../../simulation/types";

export type SimActionButtonAction = Extract<ActionTemplateId, "stand" | "walk" | "squat">;

const ACTION_BUTTONS: Array<{ action: SimActionButtonAction; label: string }> = [
  { action: "stand", label: "Stand" },
  { action: "walk", label: "Walk" },
  { action: "squat", label: "Squat" },
];

export interface ActionButtonGroupProps {
  activeAction: SimActionButtonAction;
  onAction: (action: SimActionButtonAction) => void;
}

export default function ActionButtonGroup({ activeAction, onAction }: ActionButtonGroupProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Action">
      {ACTION_BUTTONS.map(({ action, label }) => {
        const isActive = activeAction === action;

        return (
          <button
            aria-pressed={isActive}
            className={[
              "rounded px-3 py-2 text-sm font-semibold shadow-sm",
              isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700",
            ].join(" ")}
            data-testid={`action-${action}-btn`}
            key={action}
            onClick={() => onAction(action)}
            type="button"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
