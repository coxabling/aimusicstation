

import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    statusColor?: string;
    // FIX: Added `className` prop to allow external styling.
    className?: string; 
}

// FIX: Wrapped component's content in a single root div and applied `className` to it.
const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon, statusColor, className }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex items-center space-x-4 ${className || ''}`}>
    <div className={`p-3 rounded-full ${statusColor ? statusColor : 'bg-blue-100 dark:bg-blue-900 text-brand-blue'}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  </div>
));

export default StatCard;