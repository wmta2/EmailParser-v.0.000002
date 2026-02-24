import { CheckCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToList?: () => void;
  templateName: string;
  message?: string;
}

export function SaveSuccessModal({
  isOpen,
  onClose,
  onBackToList,
  templateName,
  message = 'Your changes have been saved successfully'
}: SaveSuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Template Saved!
          </h2>

          <p className="text-slate-600 mb-1">
            {message}
          </p>

          <p className="text-sm text-slate-500 mb-6">
            <span className="font-medium">{templateName}</span>
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Continue Editing
            </button>
            {onBackToList && (
              <button
                onClick={onBackToList}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Back to Templates
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-4">
            This modal will close automatically in 5 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
