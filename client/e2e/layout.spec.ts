import { expect, test, type Locator, type Page } from '@playwright/test';
import { asPlayer, everydayTable, oversizedTable, serveFakeApi, type TableData } from './fake-api';
import { landmarks, measureLayout } from './measure';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 800, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
];

type Screen = {
  name: string;
  path: string;
  player?: boolean;
  ready: (page: Page) => Locator;
  act?: (page: Page) => Promise<void>;
  landmarks: string[];
};

const SHELL = ['.top', '.tape-nav', '.table-main'];

const SCREENS: Screen[] = [
  {
    name: 'campaign list',
    path: '/campaigns',
    ready: (page) => page.getByRole('list', { name: 'Your campaigns' }),
    landmarks: [...SHELL, '.campaign-pins', '.campaign-forms'],
  },
  {
    name: 'campaign table',
    path: '/campaigns/7',
    ready: (page) => page.getByRole('region', { name: 'Session notes' }),
    act: async (page) => {
      const rolled = page.waitForResponse((response) => response.url().endsWith('/rolls') && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Roll', exact: true }).click();
      await rolled;
      await expect(page.getByRole('button', { name: 'Roll', exact: true })).toBeEnabled();
    },
    landmarks: [...SHELL, '.table-main-col', '.dice-side', '.sheets', '.notes-board'],
  },
  {
    name: 'campaign table for a player',
    path: '/campaigns/7',
    player: true,
    ready: (page) => page.getByRole('region', { name: 'Session notes' }),
    landmarks: [...SHELL, '.table-main-col', '.dice-side', '.sheets'],
  },
  {
    name: 'character sheet form',
    path: '/campaigns/7/characters/1',
    ready: (page) => page.getByLabel('Character name'),
    landmarks: [...SHELL, '.form-page', '.sheet-form'],
  },
  {
    name: 'session note form',
    path: '/campaigns/7/notes/2',
    ready: (page) => page.getByLabel('Title'),
    landmarks: [...SHELL, '.form-page', '.note-form'],
  },
];

async function showEverything(page: Page) {
  const moreButton = page.getByRole('button', { name: /^Show (more|\d+ more|\d+ older)/ });
  for (let round = 0; round < 20 && (await moreButton.count()) > 0; round += 1) {
    await moreButton.first().click();
  }
}

async function openScreen(page: Page, screen: Screen, data: TableData) {
  await serveFakeApi(page, screen.player ? asPlayer(data) : data);
  await page.goto(screen.path);
  await expect(screen.ready(page)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await showEverything(page);
  if (screen.act) await screen.act(page);
}

function expectTidy(report: Awaited<ReturnType<typeof measureLayout>>, data: string) {
  expect.soft(report.sideScroll, `${data}: page scrolls sideways past ${report.pastEdge.join(', ')}`).toBeLessThanOrEqual(0);
  expect.soft(report.outsideViewport, `${data}: text past the edge of the screen`).toEqual([]);
  expect.soft(report.overflowing, `${data}: text spilling out of its box`).toEqual([]);
  expect.soft(report.clipped, `${data}: content cut off`).toEqual([]);
  expect.soft(report.smallTargets, `${data}: tap targets under 44px`).toEqual([]);
  expect.soft(report.overlapping, `${data}: tap targets on top of each other`).toEqual([]);
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const screen of SCREENS) {
      test(`${screen.name} keeps oversized content inside the layout`, async ({ page, context }) => {
        await openScreen(page, screen, oversizedTable());
        expectTidy(await measureLayout(page), 'oversized');

        const everydayPage = await context.newPage();
        await openScreen(everydayPage, screen, everydayTable());
        expectTidy(await measureLayout(everydayPage), 'everyday');
        expect.soft(await landmarks(page, screen.landmarks), 'layout moved').toEqual(await landmarks(everydayPage, screen.landmarks));
      });
    }

    test('login and sign up keep long input inside the card', async ({ page }) => {
      await serveFakeApi(page, everydayTable(), { signedIn: false });
      await page.route((url) => url.pathname.startsWith('/api/auth/'), (route) =>
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Email or password is wrong' }) })
      );
      await page.goto('/login');
      await page.evaluate(() => document.fonts.ready);
      const before = await landmarks(page, ['.login-stack', '.login-card']);
      await page.getByRole('tab', { name: 'Sign up' }).click();
      await page.getByLabel('Display name').fill('W'.repeat(200));
      await page.getByLabel('Email').fill(`${'w'.repeat(240)}@example.com`);
      await page.getByLabel('Password').fill('p'.repeat(300));
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      expectTidy(await measureLayout(page), 'sign up');
      expect.soft(await landmarks(page, ['.login-stack', '.login-card']), 'layout moved').toEqual(before);
    });
  });
}
