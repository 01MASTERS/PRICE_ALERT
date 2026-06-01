import { BellOff } from 'lucide-react';

export const EmptyState = () => (
  <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm">
    <div className="mx-auto w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-5 rotate-3 hover:rotate-0 transition-transform duration-300">
      <BellOff className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">No active trackers yet</h3>
    <p className="text-gray-500 text-sm max-w-sm mx-auto">
      Create a price alert using the form to start tracking your favorite products.
    </p>
  </div>
);