import { BellRing, BarChart3 } from 'lucide-react';

export const Navbar = () => (
  <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-gray-800">
            Price Sentinel
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
           <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
             <BarChart3 className="w-4 h-4" />
             <span>Active Monitoring</span>
           </div>
        </div>
      </div>
    </div>
  </nav>
);
