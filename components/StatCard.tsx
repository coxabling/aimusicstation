import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    statusColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, statusColor }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex items-center space-x-4">
    <div className={`p-3 rounded-full ${statusColor ? statusColor : 'bg-blue-100 dark:bg-blue-900 text-brand-blue'}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  </div>
);

export default StatCard;
