import type { Alert } from '../types/alert';
import { Trash2, ExternalLink, Pencil, Clock, CheckCircle2 } from 'lucide-react';

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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${
      notified 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' 
        : 'bg-indigo-50 text-indigo-700 border-indigo-200/50'
    }`}>
      {notified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {notified ? 'Triggered' : 'Active'}
    </span>
  );

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div key={alert.id} className="group bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between sm:justify-start gap-3 mb-1">
                <a 
                  href={alert.productUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-base font-bold text-gray-900 hover:text-indigo-600 truncate transition-colors"
                  title={alert.productName || alert.productUrl}
                >
                  {alert.productName || alert.productUrl}
                </a>
                <a 
                  href={alert.productUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-1 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <StatusBadge notified={alert.notified} />
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {formatSchedule(alert)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 bg-gray-50/50 rounded-xl p-3 border border-gray-100/50">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Target</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(alert.targetPrice)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Current</p>
                <p className={`text-sm font-bold ${
                  alert.currentPrice && alert.currentPrice <= alert.targetPrice 
                    ? 'text-emerald-600' 
                    : 'text-gray-900'
                }`}>
                  {formatCurrency(alert.currentPrice)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:border-l border-gray-100 sm:pl-4">
              <button 
                onClick={() => onEditClick(alert)} 
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" 
                aria-label="Edit alert"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDeleteClick(alert.id)} 
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" 
                aria-label="Delete alert"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        </div>
      ))}
    </div>
  );
};
