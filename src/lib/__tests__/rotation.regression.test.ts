import { describe, it, expect } from 'vitest';
import { getCurrentGuardian } from '../rotation';

/**
 * Tests de régression avec des dates absolues connues.
 * START_DATE = 2026-02-27T12:00:00Z → Alex (index 0)
 * Chaque semaine suivante avance d'un cran dans le cycle: Alex → Joey → Elo → Nathan → Alex…
 */
describe('Régression — dates fixes connues', () => {
  it('2026-02-27 (semaine 0) → Alex', () => {
    expect(getCurrentGuardian(new Date('2026-02-27T12:00:00Z')).name).toBe('Alex');
  });

  it('2026-03-06 (semaine 1) → Joey', () => {
    expect(getCurrentGuardian(new Date('2026-03-06T12:00:00Z')).name).toBe('Joey');
  });

  it('2026-03-13 (semaine 2) → Elo', () => {
    expect(getCurrentGuardian(new Date('2026-03-13T12:00:00Z')).name).toBe('Elo');
  });

  it('2026-03-20 (semaine 3) → Nathan', () => {
    expect(getCurrentGuardian(new Date('2026-03-20T12:00:00Z')).name).toBe('Nathan');
  });

  it('2026-03-27 (semaine 4) → Alex (retour cycle)', () => {
    expect(getCurrentGuardian(new Date('2026-03-27T12:00:00Z')).name).toBe('Alex');
  });

  it('2026-02-20 (semaine -1, avant START_DATE) → Nathan', () => {
    // differenceInWeeks(2026-02-20, 2026-02-27) = -1 → index = (-1 % 4 + 4) % 4 = 3 → Nathan
    expect(getCurrentGuardian(new Date('2026-02-20T12:00:00Z')).name).toBe('Nathan');
  });

  it('2026-02-13 (semaine -2, avant START_DATE) → Elo', () => {
    // -2 % 4 = -2 → (-2 + 4) % 4 = 2 → Elo
    expect(getCurrentGuardian(new Date('2026-02-13T12:00:00Z')).name).toBe('Elo');
  });

  it('2026-04-10 (semaine 6) → Elo', () => {
    // 6 % 4 = 2 → Elo
    expect(getCurrentGuardian(new Date('2026-04-10T12:00:00Z')).name).toBe('Elo');
  });

  it('2026-04-17 (semaine 7) → Nathan', () => {
    // 7 % 4 = 3 → Nathan
    expect(getCurrentGuardian(new Date('2026-04-17T12:00:00Z')).name).toBe('Nathan');
  });
});
