import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="https://example.com/product"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Price</label>
          <input
            type="number"
            required
            min="1"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="999"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {[
            { label: 'Period', value: 'period' },
            { label: 'Custom Time(s)', value: 'custom_times' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScheduleMode(option.value as ScheduleMode)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                scheduleMode === option.value
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {scheduleMode === 'period' ? (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESET_INTERVALS.map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => {
                  setIntervalValue(String(interval));
                  setIntervalUnit('minutes');
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  intervalMinutes === interval
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {interval < 60 ? `${interval} min` : `${interval / 60} hr`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3 max-w-sm">
            <input
              type="number"
              min="1"
              value={intervalValue}
              onChange={(e) => setIntervalValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <select
              value={intervalUnit}
              onChange={(e) => setIntervalUnit(e.target.value as 'minutes' | 'hours')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customTimes.map((time, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => updateCustomTime(index, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => removeCustomTime(index)}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200"
                  aria-label="Remove time"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCustomTime}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add Time
          </button>
        </div>
      )}

      <div className={onCancel ? 'flex gap-3' : ''}>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isLoading || !url || !price || (scheduleMode === 'custom_times' && validCustomTimes.length === 0)}
          className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : submitLabel}
        </button>
      </div>
    </form>
  );
};
