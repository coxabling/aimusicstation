import React, { useEffect } from 'react';
import { useToast, Toast as ToastType } from '../contexts/ToastContext';
import { XIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from './icons';

const Toast: React.FC<{ toast: ToastType; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (toast.action) return; // Don't auto-dismiss toasts with actions

    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss, toast.action]);

  const baseClasses = 'flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-lg dark:text-gray-400 dark:bg-gray-800';
  const typeClasses = {
    success: 'text-green-500 bg-green-100 dark:bg-gray-700 dark:text-green-400',
    error: 'text-red-500 bg-red-100 dark:bg-gray-700 dark:text-red-400',
    info: 'text-blue-500 bg-blue-100 dark:bg-gray-700 dark:text-blue-400',
  };
  
  const iconClasses = `inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${typeClasses[toast.type]}`;
  
  const getIcon = () => {
      switch (toast.type) {
          case 'success': return <CheckCircleIcon />;
          case 'error': return <ExclamationCircleIcon />;
          case 'info': return <InformationCircleIcon />;
      }
  };

  const handleActionClick = () => {
    if (toast.action) {
        toast.action.onClick();
        onDismiss(toast.id); // Dismiss toast after action
    }
  };

  return (
    <div className={baseClasses} role="alert">
      <div className={iconClasses}>
        {getIcon()}
      </div>
      <div className="ml-3 text-sm font-normal">
        <p>{toast.message}</p>
        {toast.action && (
            <button 
                onClick={handleActionClick} 
                className="mt-2 px-2.5 py-1.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
                {toast.action.label}
            </button>
        )}
      </div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
        aria-label="Close"
        onClick={() => onDismiss(toast.id)}
      >
        <span className="sr-only">Close</span>
        <XIcon />
      </button>
    </div>
  );
};


const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 z-50">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;