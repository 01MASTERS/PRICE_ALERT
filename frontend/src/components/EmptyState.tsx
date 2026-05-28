import { BellOff } from 'lucide-react';

export const EmptyState = () => (
  <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
    <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
      <BellOff className="w-6 h-6 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-1">No alerts created yet</h3>
    <p className="text-gray-500 text-sm">Fill out the form above to start tracking prices.</p>
  </div>
);