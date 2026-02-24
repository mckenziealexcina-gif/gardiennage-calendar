import { getNextGuardians } from '@/lib/rotation';
import { getWeekendState } from '@/lib/kv';
import { format, nextSaturday, isSaturday } from 'date-fns';
import { frCA } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const schedule = getNextGuardians(13);
  const thisWeekend = schedule[0];

  // Lire l'état KV pour ce weekend
  const now = new Date();
  const sat = isSaturday(now) ? now : nextSaturday(now);
  const satDate = format(sat, 'yyyy-MM-dd');
  const weekendState = await getWeekendState(satDate).catch(() => null);

  // Nom affiché (remplaçant si applicable)
  const displayName =
    weekendState?.status === 'replaced' && weekendState.replacedBy
      ? weekendState.replacedBy
      : thisWeekend.name;

  // Grouper par mois
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
            {displayName}
          </p>
          <p className="text-blue-200 mt-3 text-sm">est de garde ce weekend</p>

          {weekendState?.status === 'confirmed' && (
            <span className="mt-4 inline-block bg-green-500/20 text-green-300 text-xs font-semibold px-3 py-1 rounded-full border border-green-500/40">
              ✓ Confirmé
            </span>
          )}
          {weekendState?.status === 'replaced' && (
            <span className="mt-4 inline-block bg-orange-500/20 text-orange-300 text-xs font-semibold px-3 py-1 rounded-full border border-orange-500/40">
              ⚡ Remplacement
            </span>
          )}
          {weekendState?.status === 'urgent' && (
            <span className="mt-4 inline-block bg-red-500/20 text-red-300 text-xs font-semibold px-3 py-1 rounded-full border border-red-500/40">
              ⚠ Cherche remplaçant...
            </span>
          )}
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
                  const rowName =
                    isThisWeekend && weekendState?.status === 'replaced' && weekendState.replacedBy
                      ? weekendState.replacedBy
                      : entry.name;

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
                      <div className="flex items-center gap-2">
                        {isThisWeekend && weekendState?.status === 'confirmed' && (
                          <span className="text-xs text-green-400">✓</span>
                        )}
                        {isThisWeekend && weekendState?.status === 'replaced' && (
                          <span className="text-xs text-orange-400">⚡</span>
                        )}
                        {isThisWeekend && weekendState?.status === 'urgent' && (
                          <span className="text-xs text-red-400">⚠</span>
                        )}
                        <span className={`font-semibold ${isThisWeekend ? 'text-blue-300' : 'text-gray-100'}`}>
                          {rowName}
                        </span>
                      </div>
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
