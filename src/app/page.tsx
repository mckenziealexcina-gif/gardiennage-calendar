import { getUpcomingWeekends, getSaturdayKey } from '@/lib/google';
import { format } from 'date-fns';
import { frCA } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let weekends = await getUpcomingWeekends(4).catch(() => []);
  const thisWeekend = weekends[0] ?? null;
  const upcoming = weekends.slice(1);

  const status = thisWeekend?.status ?? null;
  const displayName =
    status === 'replaced' && thisWeekend?.replacedBy
      ? thisWeekend.replacedBy
      : thisWeekend?.guardian ?? '—';

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
      badge: `⚡ Remplace ${thisWeekend?.guardian ?? ''} ce weekend`,
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
    declined: {
      bg: 'bg-red-700',
      label: 'REFUSÉ — EN ATTENTE DE REMPLAÇANT',
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
  } as const;

  const hero = status ? heroConfig[status as keyof typeof heroConfig] : null;

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="w-full max-w-lg mx-auto space-y-8 pt-6">

        {/* Bloc principal */}
        {hero ? (
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
            {status === 'replaced' && thisWeekend?.guardian && (
              <p className="text-xs text-orange-300 pt-1">
                Remplace {thisWeekend.guardian} · {thisWeekend.weekendDate}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              CE WEEKEND
            </p>
            <p className="text-4xl font-black text-gray-500">
              Aucun événement
            </p>
            <p className="text-sm text-gray-500">
              Ajouter un événement &ldquo;Gardiennage: Nom | pending&rdquo; dans Google Calendar
            </p>
          </div>
        )}

        {/* Prochains weekends */}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-1">
              Prochains weekends
            </h2>
            <ul className="space-y-2">
              {upcoming.map((entry) => {
                const name =
                  entry.status === 'replaced' && entry.replacedBy
                    ? entry.replacedBy
                    : entry.guardian;
                const icon =
                  entry.status === 'confirmed' ? '✓' :
                  entry.status === 'replaced'  ? '⚡' :
                  entry.status === 'urgent' || entry.status === 'declined' ? '⚠' : '';
                return (
                  <li
                    key={entry.eventId}
                    className="flex justify-between items-center px-4 py-3 rounded-xl bg-gray-800"
                  >
                    <span className="text-sm text-gray-400">{entry.weekendDate}</span>
                    <div className="flex items-center gap-2">
                      {icon && <span className="text-xs text-gray-400">{icon}</span>}
                      <span className="font-semibold text-gray-100">{name}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

      </div>
    </main>
  );
}
