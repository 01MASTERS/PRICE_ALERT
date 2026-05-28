import type { Alert } from '../types/alert';
import { Trash2, ExternalLink, Pencil } from 'lucide-react';

interface Props {
  alerts: Alert[];
  onDeleteClick: (id: string) => void;
  onEditClick: (alert: Alert) => void;
}

export const AlertsList = ({ alerts, onDeleteClick, onEditClick }: Props) => {
  const formatCurrency = (value?: number | null) =>
    value == null ? '-' : new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const formatInterval = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    return `${minutes / 60} hr`;
  };

  const formatSchedule = (alert: Alert) => {
    if (alert.scheduleMode === 'custom_times') {
      return alert.customTimes?.length ? alert.customTimes.join(', ') : 'Custom times';
    }

    return `Every ${formatInterval(alert.intervalMinutes)}`;
  };

  const StatusBadge = ({ notified }: { notified: boolean }) => (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
      notified ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
    }`}>
      {notified ? 'Triggered' : 'Active'}
    </span>
  );

  return (
    <>
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {alert.productName || alert.productUrl}
                    </span>
                    <a href={alert.productUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(alert.targetPrice)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(alert.currentPrice)}</td>
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge notified={alert.notified} /></td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">{formatSchedule(alert)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => onEditClick(alert)} className="text-gray-400 hover:text-blue-600 transition-colors mr-3" aria-label="Edit alert">
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDeleteClick(alert.id)} className="text-gray-400 hover:text-red-600 transition-colors" aria-label="Delete alert">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
            <div className="pr-8 mb-2 flex flex-col gap-1">
               <a href={alert.productUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                  {alert.productName || alert.productUrl}
               </a>
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => onEditClick(alert)} className="text-gray-400 hover:text-blue-600" aria-label="Edit alert">
                <Pencil className="w-5 h-5" />
              </button>
              <button onClick={() => onDeleteClick(alert.id)} className="text-gray-400 hover:text-red-600" aria-label="Delete alert">
              <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
              <div><p className="text-gray-500">Target</p><p className="font-semibold">{formatCurrency(alert.targetPrice)}</p></div>
              <div><p className="text-gray-500">Current</p><p className="font-medium">{formatCurrency(alert.currentPrice)}</p></div>
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 pt-3">
              <StatusBadge notified={alert.notified} />
              <span className="text-xs text-gray-500 truncate max-w-[150px]">{formatSchedule(alert)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
