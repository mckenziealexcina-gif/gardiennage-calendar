import { describe, it, expect } from 'vitest';
import { addWeeks } from 'date-fns';
import { getCurrentGuardian, getNextGuardians, USERS } from '../rotation';

const START_DATE = new Date('2026-02-27T12:00:00Z');

describe('getCurrentGuardian — tests unitaires', () => {
  it('retourne Alex pour la semaine 0 (= START_DATE)', () => {
    expect(getCurrentGuardian(START_DATE).name).toBe('Alex');
  });

  it('retourne Joey pour la semaine 1', () => {
    expect(getCurrentGuardian(addWeeks(START_DATE, 1)).name).toBe('Joey');
  });

  it('retourne Elo pour la semaine 2', () => {
    expect(getCurrentGuardian(addWeeks(START_DATE, 2)).name).toBe('Elo');
  });

  it('retourne Nathan pour la semaine 3', () => {
    expect(getCurrentGuardian(addWeeks(START_DATE, 3)).name).toBe('Nathan');
  });

  it('cycle complet: semaine 4 retourne Alex', () => {
    expect(getCurrentGuardian(addWeeks(START_DATE, 4)).name).toBe('Alex');
  });

  it('cycle complet: semaine 8 retourne Alex', () => {
    expect(getCurrentGuardian(addWeeks(START_DATE, 8)).name).toBe('Alex');
  });

  it('gère les dates avant START_DATE (index négatif) sans crash', () => {
    const guardian = getCurrentGuardian(addWeeks(START_DATE, -1));
    expect(USERS).toContainEqual(guardian);
  });

  it('retourne un objet avec name et phone', () => {
    const guardian = getCurrentGuardian(START_DATE);
    expect(guardian).toHaveProperty('name');
    expect(guardian).toHaveProperty('phone');
    expect(typeof guardian.name).toBe('string');
    expect(typeof guardian.phone).toBe('string');
  });

  it('le phone commence par +1', () => {
    const guardian = getCurrentGuardian(START_DATE);
    expect(guardian.phone).toMatch(/^\+1\d{10}$/);
  });
});

describe('getNextGuardians — tests unitaires', () => {
  it('retourne 13 entrées par défaut (3 mois)', () => {
    expect(getNextGuardians()).toHaveLength(13);
  });

  it('retourne le bon nombre si on passe un count custom', () => {
    expect(getNextGuardians(1)).toHaveLength(1);
    expect(getNextGuardians(8)).toHaveLength(8);
  });

  it('chaque entrée a un champ name, friday (Date) et dateLabel (string)', () => {
    for (const entry of getNextGuardians(4)) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('friday');
      expect(entry).toHaveProperty('dateLabel');
      expect(typeof entry.name).toBe('string');
      expect(entry.friday).toBeInstanceOf(Date);
      expect(typeof entry.dateLabel).toBe('string');
    }
  });

  it('le premier entry.friday est un vendredi (getDay() === 5)', () => {
    expect(getNextGuardians(1)[0].friday.getDay()).toBe(5);
  });

  it('tous les fridays sont des vendredis', () => {
    for (const entry of getNextGuardians(13)) {
      expect(entry.friday.getDay()).toBe(5);
    }
  });

  it('tous les noms sont dans la liste USERS', () => {
    const validNames = USERS.map((u) => u.name);
    for (const entry of getNextGuardians(4)) {
      expect(validNames).toContain(entry.name);
    }
  });
});
