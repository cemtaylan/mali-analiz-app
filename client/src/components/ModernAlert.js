import React from 'react';

const ModernAlert = ({ 
  isOpen, 
  onClose, 
  type = 'info', 
  title, 
  message, 
  confirmText = 'Tamam', 
  cancelText = 'İptal',
  onConfirm,
  showCancel = false,
  icon
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      confirmBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      defaultIcon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      confirmBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      defaultIcon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      defaultIcon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      confirmBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      defaultIcon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 transform transition-all">
        <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start">
              <div className={`${config.iconBg} ${config.iconColor} rounded-full p-3 mr-4 flex-shrink-0`}>
                {icon || config.defaultIcon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-semibold ${config.titleColor} mb-2`}>
                  {title}
                </h3>
                <p className={`text-sm ${config.messageColor} leading-relaxed`}>
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white bg-opacity-60 flex justify-end space-x-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm || onClose}
              className={`px-4 py-2 text-sm font-medium text-white ${config.confirmBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernAlert; 