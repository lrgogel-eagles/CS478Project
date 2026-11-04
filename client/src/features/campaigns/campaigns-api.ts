import { isInteger, isObject, isText, readList, unexpected } from '../../api/guards';
import { send } from '../../api/http';

export type Role = 'GM' | 'PLAYER';

export type Campaign = {
  id: number;
  name: string;
  description: string;
  inviteCode: string;
  createdAt: string;
};

export type Membership = {
  campaign: Campaign;
  role: Role;
};

export type Member = {
  userId: number;
  displayName: string;
  role: Role;
  joinedAt: string;
};

export const CAMPAIGN_LIMITS = {
  name: 80,
  description: 2000,
  inviteCode: 20,
} as const;

export const ROLE_LABELS = { GM: 'Game Master', PLAYER: 'Player' } as const satisfies Record<Role, string>;

const ROUTES = {
  campaigns: '/api/campaigns',
  join: '/api/campaigns/join',
  campaign: (id: number) => `/api/campaigns/${id}`,
  inviteCode: (id: number) => `/api/campaigns/${id}/invite-code`,
  members: (id: number) => `/api/campaigns/${id}/members`,
} as const;

function isRole(value: unknown): value is Role {
  return value === 'GM' || value === 'PLAYER';
}

function isCampaign(value: unknown): value is Campaign {
  return (
    isObject(value) &&
    isInteger(value.id) &&
    isText(value.name) &&
    isText(value.description) &&
    isText(value.inviteCode) &&
    isText(value.createdAt)
  );
}

function isMember(value: unknown): value is Member {
  return isObject(value) && isInteger(value.userId) && isText(value.displayName) && isRole(value.role) && isText(value.joinedAt);
}

function readMembership(data: unknown): Membership {
  if (!isObject(data) || !isCampaign(data.campaign) || !isRole(data.role)) return unexpected('campaign');
  return { campaign: data.campaign, role: data.role };
}

function readCampaign(data: unknown): Campaign {
  if (!isObject(data) || !isCampaign(data.campaign)) return unexpected('campaign');
  return data.campaign;
}

function readCampaignList(data: unknown): Membership[] {
  if (!Array.isArray(data)) return unexpected('campaign list');
  return data.map((item: unknown) => {
    if (!isObject(item)) return unexpected('campaign list');
    const { role } = item;
    if (!isRole(role) || !isCampaign(item)) return unexpected('campaign list');
    const { id, name, description, inviteCode, createdAt } = item;
    return { campaign: { id, name, description, inviteCode, createdAt }, role };
  });
}

export const campaignsApi = {
  list: () => send('GET', ROUTES.campaigns).then(readCampaignList),
  get: (id: number) => send('GET', ROUTES.campaign(id)).then(readMembership),
  create: (name: string, description: string) => send('POST', ROUTES.campaigns, { name, description }).then(readMembership),
  join: (inviteCode: string) => send('POST', ROUTES.join, { inviteCode }).then(readMembership),
  newInviteCode: (id: number) => send('POST', ROUTES.inviteCode(id)).then(readCampaign),
  members: (id: number) => send('GET', ROUTES.members(id)).then((data) => readList(data, isMember, 'member list')),
};
