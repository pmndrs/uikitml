import React from "react";

export interface ActionButtonsProps {
  onReset: () => void;
  onApply: () => void;
  hasChanges: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onReset,
  onApply,
  hasChanges,
}) => {
  return (
    <div className="action-buttons">
      <button
        className="reset-button"
        onClick={onReset}
        disabled={!hasChanges}
      >
        Reset
      </button>
      <button
        className="apply-button"
        onClick={onApply}
        disabled={!hasChanges}
      >
        Apply
      </button>
    </div>
  );
};