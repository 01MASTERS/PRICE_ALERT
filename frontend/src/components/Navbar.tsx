import { BellRing, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { User } from '../types/user';

interface Props {
  user?: User | null;
  onLogout?: () => void;
}

export const Navbar = ({ user, onLogout }: Props) => (
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
           {user ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                  {user.username.charAt(0)}
                </div>
                <span className="hidden md:inline">{user.username}</span>
              </div>
              <Link to="/settings" className="text-sm font-semibold text-gray-600 hover:text-indigo-600">
                Settings
              </Link>
              <button onClick={onLogout} className="text-sm font-semibold text-gray-600 hover:text-red-600">
                Logout
              </button>
            </>
           ) : null}
        </div>
      </div>
    </div>
  </nav>
);
