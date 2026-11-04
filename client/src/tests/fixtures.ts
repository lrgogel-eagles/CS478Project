import type { User } from '../features/auth/auth-api';
import type { Campaign, Member, Membership, Role } from '../features/campaigns/campaigns-api';
import type { Character } from '../features/characters/characters-api';
import type { Roll } from '../features/dice/dice-api';
import type { SessionNote } from '../features/notes/notes-api';

const CREATED_AT = '2026-11-01T18:00:00.000Z';

export const mira: User = { id: 1, email: 'mira@example.com', displayName: 'Mira', createdAt: CREATED_AT };
export const sam: User = { id: 2, email: 'sam@example.com', displayName: 'Sam', createdAt: CREATED_AT };
export const alex: User = { id: 3, email: 'alex@example.com', displayName: 'Alex', createdAt: CREATED_AT };

export function makeCampaign(id: number, name: string, changes: Partial<Campaign> = {}): Campaign {
  return { id, name, description: '', inviteCode: `CODE${id}`, createdAt: CREATED_AT, ...changes };
}

export function makeMembership(campaign: Campaign, role: Role): Membership {
  return { campaign, role };
}

export function makeMember(user: User, role: Role, joinedAt = CREATED_AT): Member {
  return { userId: user.id, displayName: user.displayName, role, joinedAt };
}

export function makeCharacter(id: number, owner: User, changes: Partial<Character> = {}): Character {
  return {
    id,
    campaignId: 7,
    ownerId: owner.id,
    name: `Hero ${id}`,
    race: 'Dwarf',
    charClass: 'fighter',
    level: 3,
    hitPoints: 31,
    abilityScores: { str: 16, dex: 12, con: 15, int: 8, wis: 11, cha: 10 },
    gold: 45,
    updatedAt: CREATED_AT,
    ...changes,
  };
}

export function makeNote(id: number, changes: Partial<SessionNote> = {}): SessionNote {
  return {
    id,
    campaignId: 7,
    authorId: mira.id,
    title: `Session ${id}`,
    body: 'The party reached the flooded gate.',
    sessionDate: '2026-10-28',
    isGmOnly: false,
    updatedAt: CREATED_AT,
    ...changes,
  };
}

export function makeRoll(id: number, expression: string, results: number[], modifier: number, user: User = sam): Roll {
  const total = results.reduce((sum, die) => sum + die, modifier);
  return { id, campaignId: 7, userId: user.id, displayName: user.displayName, expression, results, modifier, total, rolledAt: CREATED_AT };
}
