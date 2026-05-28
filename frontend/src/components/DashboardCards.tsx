interface Props {
    total: number;
    active: number;
    triggered: number;
  }
  
  export const DashboardCards = ({ total, active, triggered }: Props) => {
    const cards = [
      { label: 'Total Alerts', value: total, color: 'border-blue-100 bg-blue-50/50' },
      { label: 'Active Alerts', value: active, color: 'border-green-100 bg-green-50/50' },
      { label: 'Triggered Alerts', value: triggered, color: 'border-orange-100 bg-orange-50/50' },
    ];
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className={`p-6 rounded-xl border transition-all hover:shadow-md ${card.color}`}>
            <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>
    );
  };