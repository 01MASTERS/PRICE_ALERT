import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteModal = ({ isOpen, onClose, onConfirm }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900/60" onClick={onClose} />
        <div className="relative inline-block w-full max-w-sm p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl animate-fade-in border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Delete Alert</h3>
          </div>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Are you sure you want to delete this price alert? This action cannot be undone and you will no longer receive notifications for this item.
          </p>
          <div className="flex gap-3 justify-end">
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm} 
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 transition-all shadow-sm shadow-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
