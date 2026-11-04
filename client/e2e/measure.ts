import type { Page } from '@playwright/test';

export type LayoutReport = {
  sideScroll: number;
  pastEdge: string[];
  outsideViewport: string[];
  overflowing: string[];
  clipped: string[];
  smallTargets: string[];
  overlapping: string[];
};

export type Landmarks = Record<string, { left: number; width: number } | null>;

export const MIN_TARGET = 44;

const FLAT_LAYOUT = '*, *::before, *::after { transform: none !important; translate: none !important; rotate: none !important; }';

async function withFlatLayout<T>(page: Page, measure: () => Promise<T>): Promise<T> {
  const style = await page.addStyleTag({ content: FLAT_LAYOUT });
  try {
    return await measure();
  } finally {
    await style.evaluate((node) => (node as Element).remove());
  }
}

function screenEdges() {
  const viewportWidth = document.documentElement.clientWidth;
  const label = (element: Element) => {
    const name = element.className;
    const classes = typeof name === 'string' && name.trim() ? `.${name.trim().split(/\s+/).join('.')}` : '';
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
    return `${element.tagName.toLowerCase()}${classes} "${text}"`;
  };
  const isShown = (element: Element) => {
    if (element.closest('[aria-hidden="true"], .visually-hidden')) return false;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden';
  };

  const pastEdge: string[] = [];
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (!isShown(element)) continue;
    const box = element.getBoundingClientRect();
    if (box.left < -0.5 || box.right > viewportWidth + 0.5) {
      pastEdge.push(`${label(element)} ${Math.round(box.left)}..${Math.round(box.right)}`);
    }
  }

  const outsideViewport = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || !node.textContent?.trim() || !isShown(parent)) continue;
    range.selectNodeContents(node);
    for (const line of Array.from(range.getClientRects())) {
      if (line.width > 0 && (line.left < -0.5 || line.right > viewportWidth + 0.5)) outsideViewport.add(label(parent));
    }
  }

  return {
    sideScroll: document.documentElement.scrollWidth - viewportWidth,
    pastEdge: pastEdge.slice(0, 8),
    outsideViewport: [...outsideViewport],
  };
}

function boxChecks(minTarget: number) {
  const label = (element: Element) => {
    const name = element.className;
    const classes = typeof name === 'string' && name.trim() ? `.${name.trim().split(/\s+/).join('.')}` : '';
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
    return `${element.tagName.toLowerCase()}${classes} "${text}"`;
  };
  const isShown = (element: Element) => {
    if (element.closest('[aria-hidden="true"], .visually-hidden')) return false;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden';
  };

  const overflowing = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || !node.textContent?.trim() || !isShown(parent)) continue;
    range.selectNodeContents(node);
    const parentBox = parent.getBoundingClientRect();
    for (const line of Array.from(range.getClientRects())) {
      if (line.width > 0 && (line.left < parentBox.left - 1 || line.right > parentBox.right + 1)) overflowing.add(label(parent));
    }
  }

  const clipped: string[] = [];
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (!isShown(element) || element.matches('input, textarea, select')) continue;
    const style = getComputedStyle(element);
    const cutsSideways = ['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
    const isClamp = element.matches('.clamped-text:not([data-expanded])');
    const cutsDown = !isClamp && ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
    if (cutsSideways || cutsDown) clipped.push(label(element));
  }

  const hitBox = (element: Element) => {
    const box = element.getBoundingClientRect();
    const after = getComputedStyle(element, '::after');
    if (after.content === 'none' || after.position !== 'absolute') return box;
    const grow = (value: string) => Math.max(0, -(Number.parseFloat(value) || 0));
    const [left, top, right, bottom] = [after.left, after.top, after.right, after.bottom].map(grow);
    return new DOMRect(box.left - left, box.top - top, box.width + left + right, box.height + top + bottom);
  };

  const smallTargets: string[] = [];
  const hits: Array<{ element: Element; box: DOMRect }> = [];
  const targets = document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="tab"]');
  for (const target of Array.from(targets)) {
    if (!isShown(target)) continue;
    const isToggle = target.matches('input[type="checkbox"], input[type="radio"]');
    const element = isToggle ? (target.closest('label') ?? target) : target;
    const box = hitBox(element);
    hits.push({ element, box });
    if (box.width < minTarget - 0.5 || box.height < minTarget - 0.5) {
      smallTargets.push(`${label(target)} ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
  }

  const overlapping: string[] = [];
  hits.forEach((first, index) => {
    for (const second of hits.slice(index + 1)) {
      if (first.element.contains(second.element) || second.element.contains(first.element)) continue;
      const width = Math.min(first.box.right, second.box.right) - Math.max(first.box.left, second.box.left);
      const height = Math.min(first.box.bottom, second.box.bottom) - Math.max(first.box.top, second.box.top);
      if (width > 0.5 && height > 0.5) {
        overlapping.push(`${label(first.element)} / ${label(second.element)} ${Math.round(width)}x${Math.round(height)}`);
      }
    }
  });

  return { overflowing: [...overflowing], clipped, smallTargets, overlapping };
}

export async function measureLayout(page: Page): Promise<LayoutReport> {
  const onScreen = await page.evaluate(screenEdges);
  const boxes = await withFlatLayout(page, () => page.evaluate(boxChecks, MIN_TARGET));
  return { ...onScreen, ...boxes };
}

export function landmarks(page: Page, selectors: string[]): Promise<Landmarks> {
  return withFlatLayout(page, () =>
    page.evaluate((wanted) => {
      const found: Record<string, { left: number; width: number } | null> = {};
      for (const selector of wanted) {
        const element = document.querySelector(selector);
        const box = element?.getBoundingClientRect();
        found[selector] = box ? { left: Math.round(box.left), width: Math.round(box.width) } : null;
      }
      return found;
    }, selectors)
  );
}
