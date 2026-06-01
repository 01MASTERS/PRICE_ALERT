import { Loader2 } from 'lucide-react';

export const Loader = () => (
  <div className="flex flex-col justify-center items-center p-12 bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm">
    <div className="p-3 bg-indigo-50 rounded-2xl mb-4">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
    <p className="text-sm font-medium text-gray-500 animate-pulse">Loading trackers...</p>
  </div>
);