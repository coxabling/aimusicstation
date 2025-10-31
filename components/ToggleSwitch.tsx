import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, label, disabled = false }) => {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${disabled ? 'opacity-50' : ''}`} id={`toggle-label-${label.replace(/\s+/g, '-')}`}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby={`toggle-label-${label.replace(/\s+/g, '-')}`}
        className={`${
          enabled ? 'bg-brand-blue' : 'bg-gray-200 dark:bg-gray-600'
        } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={() => onChange(!enabled)}
        disabled={disabled}
      >
        <span
          className={`${
            enabled ? 'translate-x-6' : 'translate-x-1'
          } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;