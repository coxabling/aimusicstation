import React from 'react';

interface SliderProps {
    label: string;
    name: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    min: number;
    max: number;
    step?: number;
    disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({ label, name, value, onChange, min, max, step = 1, disabled = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label} <span className="text-brand-blue font-semibold">{value}</span>
        </label>
        <input
            id={name}
            name={name}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:bg-brand-blue [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow
                       disabled:[&::-webkit-slider-thumb]:bg-gray-400"
        />
    </div>
);

export default Slider;
