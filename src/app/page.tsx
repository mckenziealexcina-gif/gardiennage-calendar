import { getNextGuardians } from '@/lib/rotation';
import { format } from 'date-fns';
import { frCA } from 'date-fns/locale';

export default function HomePage() {
  const schedule = getNextGuardians(13);
  const thisWeekend = schedule[0];

  // Group by month
  const byMonth: Record<string, typeof schedule> = {};
  for (const entry of schedule) {
    const monthKey = format(entry.friday, 'MMMM yyyy', { locale: frCA });
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(entry);
  }

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="w-full max-w-lg mx-auto space-y-8 pt-6">

        {/* Ce weekend */}
        <div className="bg-blue-600 rounded-2xl shadow-xl p-8 text-center">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-2">
            Ce weekend — vendredi {thisWeekend.dateLabel}
          </p>
          <p className="text-6xl font-black text-white">
            {thisWeekend.name}
          </p>
          <p className="text-blue-200 mt-3 text-sm">est de garde ce weekend</p>
        </div>

        {/* Horaire 3 mois */}
        <div className="space-y-6">
          {Object.entries(byMonth).map(([month, entries]) => (
            <div key={month}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2 px-1">
                {month}
              </h2>
              <ul className="space-y-2">
                {entries.map((entry, i) => {
                  const isThisWeekend = i === 0 && entry === thisWeekend;
                  return (
                    <li
                      key={entry.friday.toISOString()}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl ${
                        isThisWeekend
                          ? 'bg-blue-600/20 border border-blue-500/40'
                          : 'bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isThisWeekend && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        )}
                        <span className={`text-sm ${isThisWeekend ? 'text-blue-300' : 'text-gray-400'}`}>
                          Vendredi {entry.dateLabel}
                        </span>
                      </div>
                      <span className={`font-semibold ${isThisWeekend ? 'text-blue-300' : 'text-gray-100'}`}>
                        {entry.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
