import { getCurrentGuardian, getNextGuardians } from '@/lib/rotation';

export default function HomePage() {
  const currentGuardian = getCurrentGuardian();
  const nextGuardians = getNextGuardians(4);

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-2xl font-semibold text-center mb-4 text-gray-400">
          Rotation de Gardiennage
        </h1>

        <div className="bg-gray-800 rounded-lg shadow-lg p-6 text-center mb-8">
          <h2 className="text-lg mb-2 text-gray-400">Gardien actuel</h2>
          <p className="text-4xl font-bold text-blue-400">
            {currentGuardian.name}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg mb-4 text-center text-gray-400">
            Prochains weekends
          </h2>
          <ul className="space-y-3">
            {nextGuardians.map((guardian, index) => (
              <li
                key={index}
                className="flex justify-between items-center bg-gray-700 p-3 rounded-md"
              >
                <span className="text-gray-300">{guardian.date}</span>
                <span className="font-semibold text-blue-400">
                  {guardian.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
