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
  it('retourne 13 entrées par défaut (3 mois)', () => {
    const result = getNextGuardians();
    expect(result).toHaveLength(13);
  });

  it('retourne le bon nombre si on passe un count custom', () => {
    expect(getNextGuardians(1)).toHaveLength(1);
    expect(getNextGuardians(8)).toHaveLength(8);
  });

  it('chaque entrée a un champ name, friday (Date) et dateLabel (string)', () => {
    const result = getNextGuardians(4);
    for (const entry of result) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('friday');
      expect(entry).toHaveProperty('dateLabel');
      expect(typeof entry.name).toBe('string');
      expect(entry.friday).toBeInstanceOf(Date);
      expect(typeof entry.dateLabel).toBe('string');
    }
  });

  it('le premier entry.friday est un vendredi (getDay() === 5)', () => {
    const result = getNextGuardians(1);
    expect(result[0].friday.getDay()).toBe(5);
  });

  it('tous les fridays sont des vendredis', () => {
    const result = getNextGuardians(13);
    for (const entry of result) {
      expect(entry.friday.getDay()).toBe(5);
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
