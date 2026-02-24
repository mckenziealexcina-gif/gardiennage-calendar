import { describe, it, expect, beforeEach } from 'vitest';
import { addWeeks } from 'date-fns';
import { getCurrentGuardian, getNextGuardians, USERS } from '../rotation';

// The START_DATE used by the module: 2026-02-27T12:00:00Z (Alex = index 0)
const START_DATE = new Date('2026-02-27T12:00:00Z');

describe('getCurrentGuardian — tests unitaires', () => {
  it('retourne Alex pour la semaine 0 (= START_DATE)', () => {
    const guardian = getCurrentGuardian(START_DATE);
    expect(guardian.name).toBe('Alex');
  });

  it('retourne Joey pour la semaine 1', () => {
    const guardian = getCurrentGuardian(addWeeks(START_DATE, 1));
    expect(guardian.name).toBe('Joey');
  });

  it('retourne Elo pour la semaine 2', () => {
    const guardian = getCurrentGuardian(addWeeks(START_DATE, 2));
    expect(guardian.name).toBe('Elo');
  });

  it('retourne Nathan pour la semaine 3', () => {
    const guardian = getCurrentGuardian(addWeeks(START_DATE, 3));
    expect(guardian.name).toBe('Nathan');
  });

  it('cycle complet: semaine 4 retourne Alex de nouveau', () => {
    const guardian = getCurrentGuardian(addWeeks(START_DATE, 4));
    expect(guardian.name).toBe('Alex');
  });

  it('cycle complet: semaine 8 retourne Alex de nouveau', () => {
    const guardian = getCurrentGuardian(addWeeks(START_DATE, 8));
    expect(guardian.name).toBe('Alex');
  });

  it('gère les dates avant START_DATE (index négatif) sans crash', () => {
    const before = addWeeks(START_DATE, -1);
    const guardian = getCurrentGuardian(before);
    expect(USERS).toContainEqual(guardian);
  });

  it('retourne un objet avec name et email', () => {
    const guardian = getCurrentGuardian(START_DATE);
    expect(guardian).toHaveProperty('name');
    expect(guardian).toHaveProperty('email');
    expect(typeof guardian.name).toBe('string');
    expect(typeof guardian.email).toBe('string');
  });

  it("l'email contient un @", () => {
    const guardian = getCurrentGuardian(START_DATE);
    expect(guardian.email).toContain('@');
  });
});

describe('getNextGuardians — tests unitaires', () => {
  it('retourne exactement 4 entrées par défaut', () => {
    const result = getNextGuardians(4);
    expect(result).toHaveLength(4);
  });

  it('retourne le bon nombre si on passe un count custom', () => {
    expect(getNextGuardians(1)).toHaveLength(1);
    expect(getNextGuardians(8)).toHaveLength(8);
  });

  it('chaque entrée a un champ name et date', () => {
    const result = getNextGuardians(4);
    for (const entry of result) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('date');
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.date).toBe('string');
    }
  });

  it('tous les noms sont dans la liste USERS', () => {
    const validNames = USERS.map((u) => u.name);
    const result = getNextGuardians(4);
    for (const entry of result) {
      expect(validNames).toContain(entry.name);
    }
  });
});
