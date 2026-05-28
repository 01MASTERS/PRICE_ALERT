import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteModal = ({ isOpen, onClose, onConfirm }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative inline-block w-full max-w-sm p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 bg-red-50 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Delete Alert</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this price alert? This action cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
};