import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CreateAlertReq } from '../types/alert';
import { Loader2 } from 'lucide-react';

const INTERVALS = [15, 30, 60, 120, 360];

interface Props {
  onSubmit: (data: CreateAlertReq) => Promise<void>;
  isLoading: boolean;
}

export const AlertForm = ({ onSubmit, isLoading }: Props) => {
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(30);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url || !price) return;
    await onSubmit({ productUrl: url, targetPrice: Number(price), intervalMinutes });
    setUrl('');
    setPrice('');
    setIntervalMinutes(30);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
      <h2 className="text-lg font-semibold mb-4">Create New Alert</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="https://example.com/product"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Price</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="99.99"
          />
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Check Interval</label>
        <div className="flex flex-wrap gap-2">
          {INTERVALS.map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => setIntervalMinutes(interval)}
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
      </div>

      <button
        type="submit"
        disabled={isLoading || !url || !price}
        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Alert'}
      </button>
    </form>
  );
};
