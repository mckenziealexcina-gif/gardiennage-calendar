import { getNextGuardians } from '@/lib/rotation';
import { getWeekendState } from '@/lib/kv';
import { format, nextSaturday, isSaturday } from 'date-fns';
import { frCA } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const schedule = getNextGuardians(13);
  const thisWeekend = schedule[0];

  const now = new Date();
  const sat = isSaturday(now) ? now : nextSaturday(now);
  const satDate = format(sat, 'yyyy-MM-dd');
  const state = await getWeekendState(satDate).catch(() => null);

  const status = state?.status ?? 'pending';
  const displayName =
    status === 'replaced' && state?.replacedBy
      ? state.replacedBy
      : thisWeekend.name;

  // Couleur + contenu du bloc selon le statut
  const heroConfig = {
    confirmed: {
      bg: 'bg-green-700',
      label: 'CONFIRMÉ — DE GARDE CE WEEKEND',
      labelColor: 'text-green-200',
      badge: '✓ A confirmé sa présence',
      badgeStyle: 'bg-green-500/30 text-green-100 border border-green-400/50',
      subtext: 'est de garde ce weekend',
    },
    replaced: {
      bg: 'bg-orange-600',
      label: 'REMPLACEMENT CONFIRMÉ',
      labelColor: 'text-orange-200',
      badge: `⚡ Remplace ${state?.guardian ?? thisWeekend.name} ce weekend`,
      badgeStyle: 'bg-orange-500/30 text-orange-100 border border-orange-400/50',
      subtext: 'a pris le poste',
    },
    urgent: {
      bg: 'bg-red-700',
      label: 'URGENCE — EN ATTENTE DE REMPLAÇANT',
      labelColor: 'text-red-200',
      badge: '⚠ Cherche un remplaçant...',
      badgeStyle: 'bg-red-500/30 text-red-100 border border-red-400/50',
      subtext: 'ne peut pas être de garde',
    },
    pending: {
      bg: 'bg-blue-600',
      label: 'CE WEEKEND — EN ATTENTE DE CONFIRMATION',
      labelColor: 'text-blue-200',
      badge: '⏳ Confirmation en attente',
      badgeStyle: 'bg-blue-500/30 text-blue-100 border border-blue-400/50',
      subtext: 'est de garde ce weekend',
    },
    declined: {
      bg: 'bg-red-700',
      label: 'REFUSÉ — EN ATTENTE DE REMPLAÇANT',
      labelColor: 'text-red-200',
      badge: '⚠ Cherche un remplaçant...',
      badgeStyle: 'bg-red-500/30 text-red-100 border border-red-400/50',
      subtext: 'ne peut pas être de garde',
    },
  } as const;

  const hero = heroConfig[status as keyof typeof heroConfig] ?? heroConfig.pending;

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

        {/* Bloc principal — statut weekend */}
        <div className={`${hero.bg} rounded-2xl shadow-xl p-8 text-center space-y-3`}>
          <p className={`text-xs font-bold uppercase tracking-widest ${hero.labelColor}`}>
            {hero.label}
          </p>

          <p className="text-7xl font-black text-white leading-none">
            {displayName}
          </p>

          <p className={`text-sm font-medium ${hero.labelColor}`}>
            {hero.subtext}
          </p>

          <div className="pt-2">
            <span className={`inline-block text-sm font-semibold px-4 py-2 rounded-full ${hero.badgeStyle}`}>
              {hero.badge}
            </span>
          </div>

          {/* Si remplacement: montrer qui a été remplacé */}
          {status === 'replaced' && state?.guardian && (
            <p className="text-xs text-orange-300 pt-1">
              Remplace {state.guardian} · vendredi {thisWeekend.dateLabel}
            </p>
          )}

          {/* Si pending: date */}
          {status === 'pending' && (
            <p className={`text-xs ${hero.labelColor}`}>
              Vendredi {thisWeekend.dateLabel}
            </p>
          )}

          {/* Si confirmed: date */}
          {status === 'confirmed' && (
            <p className={`text-xs ${hero.labelColor}`}>
              Vendredi {thisWeekend.dateLabel}
            </p>
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
                {entries.map((entry) => {
                  const isThis = entry === thisWeekend;
                  const rowName =
                    isThis && status === 'replaced' && state?.replacedBy
                      ? state.replacedBy
                      : entry.name;

                  const rowIcon =
                    isThis && status === 'confirmed' ? '✓' :
                    isThis && status === 'replaced'  ? '⚡' :
                    isThis && (status === 'urgent' || status === 'declined') ? '⚠' :
                    isThis && status === 'pending'   ? '⏳' :
                    null;

                  const rowColor =
                    isThis && status === 'confirmed' ? 'text-green-400' :
                    isThis && status === 'replaced'  ? 'text-orange-400' :
                    isThis && (status === 'urgent' || status === 'declined') ? 'text-red-400' :
                    'text-blue-400';

                  return (
                    <li
                      key={entry.friday.toISOString()}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl ${
                        isThis
                          ? status === 'confirmed' ? 'bg-green-700/20 border border-green-500/40'
                          : status === 'replaced'  ? 'bg-orange-600/20 border border-orange-500/40'
                          : status === 'urgent' || status === 'declined' ? 'bg-red-700/20 border border-red-500/40'
                          : 'bg-blue-600/20 border border-blue-500/40'
                          : 'bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isThis && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            status === 'confirmed' ? 'bg-green-400' :
                            status === 'replaced'  ? 'bg-orange-400' :
                            status === 'urgent' || status === 'declined' ? 'bg-red-400' :
                            'bg-blue-400'
                          }`} />
                        )}
                        <span className={`text-sm ${isThis ? rowColor : 'text-gray-400'}`}>
                          Vendredi {entry.dateLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {rowIcon && (
                          <span className={`text-xs ${rowColor}`}>{rowIcon}</span>
                        )}
                        <span className={`font-semibold ${isThis ? rowColor : 'text-gray-100'}`}>
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
