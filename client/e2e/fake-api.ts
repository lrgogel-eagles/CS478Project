import type { Page } from '@playwright/test';

type User = { id: number; email: string; displayName: string; createdAt: string };
type Role = 'GM' | 'PLAYER';
type Campaign = { id: number; name: string; description: string; inviteCode: string; createdAt: string };
type Member = { userId: number; displayName: string; role: Role; joinedAt: string };
type Scores = { str: number; dex: number; con: number; int: number; wis: number; cha: number };
type Character = {
  id: number;
  campaignId: number;
  ownerId: number;
  name: string;
  race: string;
  charClass: string;
  level: number;
  hitPoints: number;
  abilityScores: Scores;
  gold: number;
  updatedAt: string;
};
type Note = { id: number; campaignId: number; authorId: number; title: string; body: string; sessionDate: string; isGmOnly: boolean; updatedAt: string };
type Roll = {
  id: number;
  campaignId: number;
  userId: number;
  displayName: string;
  expression: string;
  results: number[];
  modifier: number;
  total: number;
  rolledAt: string;
};

export type TableData = {
  user: User;
  role: Role;
  campaign: Campaign;
  otherCampaigns: Array<Campaign & { role: Role }>;
  members: Member[];
  characters: Character[];
  notes: Note[];
  rolls: Roll[];
  nextRoll: Roll;
};

const AT = '2026-11-01T18:00:00.000Z';

function user(id: number, displayName: string): User {
  return { id, email: `player${id}@example.com`, displayName, createdAt: AT };
}

function roll(id: number, who: User, expression: string, results: number[], modifier: number): Roll {
  const total = results.reduce((sum, value) => sum + value, modifier);
  return { id, campaignId: 7, userId: who.id, displayName: who.displayName, expression, results, modifier, total, rolledAt: AT };
}

function character(id: number, owner: User, changes: Partial<Character>): Character {
  return {
    id,
    campaignId: 7,
    ownerId: owner.id,
    name: 'Thorne',
    race: 'Dwarf',
    charClass: 'fighter',
    level: 3,
    hitPoints: 31,
    abilityScores: { str: 16, dex: 12, con: 15, int: 8, wis: 11, cha: 10 },
    gold: 45,
    updatedAt: AT,
    ...changes,
  };
}

function note(id: number, changes: Partial<Note>): Note {
  return { id, campaignId: 7, authorId: 1, title: `Session ${id}`, body: '', sessionDate: '2026-10-28', isGmOnly: false, updatedAt: AT, ...changes };
}

export function everydayTable(): TableData {
  const mira = user(1, 'Mira');
  const sam = user(2, 'Sam');
  const alex = user(3, 'Alex');
  return {
    user: mira,
    role: 'GM',
    campaign: {
      id: 7,
      name: 'The Sunken Keep',
      description: 'A flooded fortress on the coast. The tide comes in twice a night and the lower halls go under.',
      inviteCode: 'KEEP42',
      createdAt: AT,
    },
    otherCampaigns: [
      { id: 8, name: 'Lanterns of Vell', description: 'A city where the lights go out one street at a time.', inviteCode: 'VELL11', createdAt: AT, role: 'PLAYER' },
      { id: 9, name: 'One-shot: The Mill', description: '', inviteCode: 'MILL03', createdAt: AT, role: 'GM' },
    ],
    members: [
      { userId: mira.id, displayName: mira.displayName, role: 'GM', joinedAt: AT },
      { userId: sam.id, displayName: sam.displayName, role: 'PLAYER', joinedAt: AT },
      { userId: alex.id, displayName: alex.displayName, role: 'PLAYER', joinedAt: AT },
    ],
    characters: [
      character(1, sam, {}),
      character(2, alex, { name: 'Pip', race: 'Halfling', charClass: 'rogue', hitPoints: 20, gold: 112, abilityScores: { str: 8, dex: 17, con: 12, int: 13, wis: 10, cha: 14 } }),
    ],
    notes: [
      note(3, { title: 'Session 3', sessionDate: '2026-11-04', body: 'The party reached the flooded gate and Pip found a way through the grate.' }),
      note(2, { title: 'Trap ideas', isGmOnly: true, body: 'Water rises one room per hour once the lever is pulled.' }),
      note(1, { title: 'Session 2', sessionDate: '2026-10-21', body: 'Met the lighthouse keeper.' }),
    ],
    rolls: [roll(3, alex, '1d20', [20], 0), roll(2, sam, '2d6+3', [4, 6], 3), roll(1, mira, '1d20-1', [12], -1)],
    nextRoll: roll(4, mira, '1d20+5', [14], 5),
  };
}

const LONG_WORD = 'W';

export function oversizedTable(): TableData {
  const self = user(1, LONG_WORD.repeat(40));
  const others = Array.from({ length: 12 }, (_, index) => user(10 + index, `${'Bartholomew Underhill '.repeat(2)}${index}`.slice(0, 40)));
  const sentence = 'The tide comes in twice a night and the lower halls go under. ';
  return {
    user: self,
    role: 'GM',
    campaign: {
      id: 7,
      name: LONG_WORD.repeat(80),
      description: `${LONG_WORD.repeat(300)} ${sentence.repeat(27)}`.slice(0, 2000),
      inviteCode: LONG_WORD.repeat(20),
      createdAt: AT,
    },
    otherCampaigns: Array.from({ length: 11 }, (_, index) => ({
      id: 100 + index,
      name: index % 2 === 0 ? LONG_WORD.repeat(80) : sentence.slice(0, 80),
      description: `${LONG_WORD.repeat(200)} ${sentence.repeat(30)}`.slice(0, 2000),
      inviteCode: LONG_WORD.repeat(20),
      createdAt: AT,
      role: index % 3 === 0 ? 'GM' : 'PLAYER',
    })),
    members: [
      { userId: self.id, displayName: self.displayName, role: 'GM', joinedAt: AT },
      ...others.map((other): Member => ({ userId: other.id, displayName: other.displayName, role: 'PLAYER', joinedAt: AT })),
    ],
    characters: Array.from({ length: 7 }, (_, index) =>
      character(index + 1, others[index] ?? self, {
        name: LONG_WORD.repeat(60),
        race: LONG_WORD.repeat(40),
        charClass: LONG_WORD.repeat(40),
        level: 20,
        hitPoints: index % 2 === 0 ? -999 : 9999,
        gold: 2147483647,
        abilityScores: { str: 30, dex: 1, con: 30, int: 1, wis: 30, cha: 1 },
      })
    ),
    notes: Array.from({ length: 8 }, (_, index) =>
      note(8 - index, {
        title: index === 1 ? LONG_WORD.repeat(120) : `${sentence.repeat(2)}`.slice(0, 120),
        body: `${LONG_WORD.repeat(500)} ${sentence.repeat(400)}`.slice(0, 20000),
        isGmOnly: index % 3 === 1,
      })
    ),
    rolls: Array.from({ length: 20 }, (_, index) =>
      roll(20 - index, others[index % others.length] ?? self, '100d100+99999', Array.from({ length: 100 }, () => 100), 99999)
    ),
    nextRoll: roll(21, self, '100d100+99999', Array.from({ length: 100 }, () => 100), 99999),
  };
}

export function asPlayer(data: TableData): TableData {
  const player = data.members.find((member) => member.role === 'PLAYER');
  if (!player) return data;
  return { ...data, role: 'PLAYER', user: user(player.userId, player.displayName) };
}

function answer(method: string, path: string, data: TableData): unknown {
  const { campaign } = data;
  if (method === 'GET' && path === '/api/campaigns') return [{ ...campaign, role: data.role }, ...data.otherCampaigns];
  if (method === 'GET' && path === `/api/campaigns/${campaign.id}`) return { campaign, role: data.role };
  if (method === 'GET' && path === `/api/campaigns/${campaign.id}/members`) return data.members;
  if (method === 'GET' && path === `/api/campaigns/${campaign.id}/characters`) return data.characters;
  if (method === 'GET' && path === `/api/campaigns/${campaign.id}/notes`) return data.notes;
  if (method === 'GET' && path === `/api/campaigns/${campaign.id}/rolls`) return data.rolls;
  if (method === 'POST' && path === `/api/campaigns/${campaign.id}/rolls`) return data.nextRoll;
  const characterMatch = /^\/api\/campaigns\/\d+\/characters\/(\d+)$/.exec(path);
  if (method === 'GET' && characterMatch) return data.characters.find((entry) => entry.id === Number(characterMatch[1]));
  const noteMatch = /^\/api\/campaigns\/\d+\/notes\/(\d+)$/.exec(path);
  if (method === 'GET' && noteMatch) return data.notes.find((entry) => entry.id === Number(noteMatch[1]));
  return undefined;
}

export function isApi(url: URL) {
  return url.pathname.startsWith('/api/');
}

export async function serveFakeApi(page: Page, data: TableData, { signedIn = true } = {}) {
  if (signedIn) {
    await page.addInitScript((who) => {
      sessionStorage.setItem('ck_token', 'layout-token');
      sessionStorage.setItem('ck_user', JSON.stringify(who));
    }, data.user);
  }
  await page.route(isApi, async (route) => {
    const url = new URL(route.request().url());
    const reply = answer(route.request().method(), url.pathname, data);
    await route.fulfill({
      status: reply === undefined ? 404 : 200,
      contentType: 'application/json',
      body: JSON.stringify(reply ?? { error: 'Not found' }),
    });
  });
}
