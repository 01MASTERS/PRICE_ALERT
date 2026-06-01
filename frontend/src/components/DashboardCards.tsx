import { Activity, CheckCircle2, TrendingUp } from 'lucide-react';

interface Props {
  total: number;
  active: number;
  triggered: number;
}

export const DashboardCards = ({ total, active, triggered }: Props) => {
  const cards = [
    { 
      label: 'Total Trackers', 
      value: total, 
      icon: Activity,
      color: 'from-blue-50 to-indigo-50/50',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      borderColor: 'border-blue-100'
    },
    { 
      label: 'Active Monitoring', 
      value: active, 
      icon: TrendingUp,
      color: 'from-emerald-50 to-teal-50/50',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      borderColor: 'border-emerald-100'
    },
    { 
      label: 'Target Reached', 
      value: triggered, 
      icon: CheckCircle2,
      color: 'from-purple-50 to-fuchsia-50/50',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      borderColor: 'border-purple-100'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div 
            key={card.label} 
            className={`relative overflow-hidden p-6 rounded-2xl border ${card.borderColor} bg-gradient-to-br ${card.color} transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">{card.value}</p>
              <p className="text-sm font-medium text-gray-600">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};