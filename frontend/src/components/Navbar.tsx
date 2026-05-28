import { BellRing } from 'lucide-react';

export const Navbar = () => (
  <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <BellRing className="w-6 h-6 text-blue-600" />
          </div>
          <span className="font-semibold text-xl tracking-tight">Price Alert</span>
        </div>
      </div>
    </div>
  </nav>
);