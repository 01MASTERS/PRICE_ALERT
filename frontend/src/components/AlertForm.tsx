import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Plus, X, Link, IndianRupee, Clock } from 'lucide-react';
import type { Alert, CreateAlertReq, ScheduleMode } from '../types/alert';

const PRESET_INTERVALS = [5, 15, 30, 60, 120];

interface Props {
  onSubmit: (data: CreateAlertReq) => Promise<void>;
  isLoading: boolean;
  initialAlert?: Alert | null;
  submitLabel?: string;
  title?: string;
  onCancel?: () => void;
}

const getIntervalFields = (minutes: number) => {
  if (minutes >= 60 && minutes % 60 === 0) {
    return { value: String(minutes / 60), unit: 'hours' as const };
  }

  return { value: String(minutes), unit: 'minutes' as const };
};

export const AlertForm = ({
  onSubmit,
  isLoading,
  initialAlert = null,
  submitLabel = 'Create Alert',
  title = 'Create New Alert',
  onCancel,
}: Props) => {
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('period');
  const [intervalValue, setIntervalValue] = useState('30');
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours'>('minutes');
  const [customTimes, setCustomTimes] = useState(['09:00']);

  useEffect(() => {
    if (!initialAlert) return;

    const interval = getIntervalFields(initialAlert.intervalMinutes);
    setUrl(initialAlert.productUrl);
    setPrice(String(initialAlert.targetPrice));
    setScheduleMode(initialAlert.scheduleMode);
    setIntervalValue(interval.value);
    setIntervalUnit(interval.unit);
    setCustomTimes(initialAlert.customTimes?.length ? initialAlert.customTimes : ['09:00']);
  }, [initialAlert]);

  const intervalMinutes = Math.max(
    1,
    Number(intervalValue || 0) * (intervalUnit === 'hours' ? 60 : 1),
  );
  const validCustomTimes = customTimes.filter(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url || !price) return;
    if (scheduleMode === 'custom_times' && validCustomTimes.length === 0) return;

    await onSubmit({
      productUrl: url,
      targetPrice: Number(price),
      intervalMinutes,
      scheduleMode,
      customTimes: scheduleMode === 'custom_times' ? validCustomTimes : undefined,
    });

    if (!initialAlert) {
      setUrl('');
      setPrice('');
      setScheduleMode('period');
      setIntervalValue('30');
      setIntervalUnit('minutes');
      setCustomTimes(['09:00']);
    }
  };

  const addCustomTime = () => {
    setCustomTimes((prev) => [...prev, '']);
  };

  const updateCustomTime = (index: number, value: string) => {
    setCustomTimes((prev) => prev.map((time, currentIndex) => (
      currentIndex === index ? value : time
    )));
  };

  const removeCustomTime = (index: number) => {
    setCustomTimes((prev) => (
      prev.length === 1 ? [''] : prev.filter((_, currentIndex) => currentIndex !== index)
    ));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm transition-all">
      <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">{title}</h2>
      
      <div className="space-y-5 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Product URL</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Link className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all sm:text-sm"
              placeholder="https://example.com/product"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Target Price</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IndianRupee className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all sm:text-sm"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 pt-4 border-t border-gray-100">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <Clock className="w-4 h-4 text-gray-500" /> Schedule Mode
        </label>
        <div className="inline-flex w-full sm:w-auto rounded-xl border border-gray-200 bg-gray-50/50 p-1 mb-4">
          {[
            { label: 'Intervals', value: 'period' },
            { label: 'Specific Time(s)', value: 'custom_times' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScheduleMode(option.value as ScheduleMode)}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                scheduleMode === option.value
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {scheduleMode === 'period' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap gap-2">
              {PRESET_INTERVALS.map((interval) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => {
                    setIntervalValue(String(interval));
                    setIntervalUnit('minutes');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    intervalMinutes === interval
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {interval < 60 ? `${interval} min` : `${interval / 60} hr`}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <input
                type="number"
                min="1"
                value={intervalValue}
                onChange={(e) => setIntervalValue(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all sm:text-sm"
              />
              <select
                value={intervalUnit}
                onChange={(e) => setIntervalUnit(e.target.value as 'minutes' | 'hours')}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all sm:text-sm"
              >
                <option value="minutes">Mins</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <div className="space-y-2">
              {customTimes.map((time, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateCustomTime(index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomTime(index)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Remove time"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCustomTime}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Another Time
            </button>
          </div>
        )}
      </div>

      <div className={`mt-6 ${onCancel ? 'grid grid-cols-2 gap-3' : ''}`}>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isLoading || !url || !price || (scheduleMode === 'custom_times' && validCustomTimes.length === 0)}
          className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
