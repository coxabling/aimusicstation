import React, { ChangeEvent } from 'react';

interface InputFieldProps {
    label: string;
    name: string;
    type?: string;
    value: string;
    placeholder: string;
    isTextarea?: boolean;
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, type = 'text', value, placeholder, isTextarea, onChange, disabled = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        {isTextarea ? (
            <textarea
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                placeholder={placeholder}
                rows={4}
                disabled={disabled}
            ></textarea>
        ) : (
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue focus:border-brand-blue bg-white dark:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                placeholder={placeholder}
                disabled={disabled}
            />
        )}
    </div>
);

export default InputField;