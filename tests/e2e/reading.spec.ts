import { expect, test, type Page } from '@playwright/test';

const CHAPTERS = ['ch0-kernel', 'ch1-measurement', 'ch2-production', 'ch3-solow'];

/** Console errors are failures: a reader should never see a broken interactive. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test('T1402 every chapter renders without a broken interactive', async ({ page }) => {
  const errors = watchConsole(page);
  for (const id of CHAPTERS) {
    await page.goto(`/#/${id}`);
    await expect(page.locator('h1')).toBeVisible();
    // An error boundary rendering means an interactive threw.
    await expect(page.locator('.boundary')).toHaveCount(0);
    await expect(page.locator('.prose p').first()).toBeVisible();
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('T1401 the sorting exercise scores and survives a reload', async ({ page }) => {
  await page.goto('/#/ch0-kernel');
  // The chapter carries two sorting exercises: the terminal objective, and the
  // case study's briefing note. This is the first.
  const exercise = page.locator('.sorter').first();
  const rows = exercise.locator('.sorter__rows > li');
    await expect(rows).toHaveCount(11);

  // Answer every one correctly by clicking the button the model says is right.
  const answers = [
    'accounting', 'assumption', 'accounting', 'assumption', 'assumption',
    'accounting', 'assumption', 'assumption', 'accounting', 'accounting',
    'assumption',
  ];
  for (let i = 0; i < answers.length; i += 1) {
    await rows.nth(i).getByRole('button', { name: answers[i]! }).click();
  }
  await exercise.getByRole('button', { name: 'check' }).click();
    await expect(exercise.locator('.predict__run')).toHaveText('11 of 11');

  await page.goto('/#/');
    await expect(page.locator('.record')).toContainText('11 of 11 equations sorted correctly');
});

test('T1403 breaking an identity names it and offers repairs', async ({ page }) => {
  await page.goto('/#/ch1-measurement');
  await expect(page.locator('.reconcile--ok')).toBeVisible();

  await page.getByRole('button', { name: 'raise G by 50' }).click();

  await expect(page.locator('.reconcile__head')).toContainText('Spending equals earning');
  await expect(page.locator('.invariants li.bad')).toHaveCount(1);
  // You cannot change one arrow alone: several single repairs exist.
  const options = page.locator('.reconcile__options button');
  expect(await options.count()).toBeGreaterThan(3);

  // Applying one of them restores every identity.
  await options.filter({ hasText: 'W' }).first().click();
  await expect(page.locator('.reconcile--ok')).toBeVisible();
  await expect(page.locator('.invariants li.bad')).toHaveCount(0);
});

test('T1404 the model does not run until a prediction is committed', async ({ page }) => {
  await page.goto('/#/ch2-production');
  const run = page.locator('.predict__run');
  await expect(run).toBeDisabled();

  const rows = page.locator('.predict__rows > li');
  await expect(rows).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) {
    await rows.nth(i).locator('.predict__opt').first().click();
  }
  await expect(run).toBeEnabled();
  await run.click();
  await expect(run).toBeDisabled();
  await expect(page.locator('.predict__verdict').first()).toBeVisible();
});

test('T1405 raising the savings rate leaves output where it was', async ({ page }) => {
  await page.goto('/#/ch3-solow');
  const unchanged = page.locator('.unchanged__chips');
  await expect(unchanged).toBeVisible();
  // Output is in the list of things that did not move — the chapter's point.
  await expect(unchanged.locator('.chip', { hasText: /^Y$/ })).toHaveCount(1);
  await expect(page.locator('.trace__steps > li')).toHaveCount(3);
});

test('T1416 the code behind an equation is the code that ran', async ({ page }) => {
  await page.goto('/#/ch3-solow');
  await page.locator('.equation .reveal__toggle').click();
  const code = page.locator('.equation .reveal__code');
  await expect(code).toContainText('dt');
  await expect(code).toContainText('depreciation');
  await expect(page.locator('.equation .reveal__result')).toContainText('$');
});

test('T1407 a scenario link reopens the same state', async ({ page, context }) => {
  await page.goto('/#/ch3-solow');
  await page.getByRole('button', { name: 'set d̄ = 0' }).click();
  await expect(page.locator('.loop__tag--amplifying')).toBeVisible();

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'copy a link to this' }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('?s=v1.');

  const fresh = await context.newPage();
  await fresh.goto(url);
  await expect(fresh.locator('.loop__tag--amplifying')).toBeVisible();
  await fresh.close();
});

test('T1408 progress is remembered across a reload', async ({ page }) => {
  await page.goto('/#/ch2-production');
  await page.goto('/#/');
  await expect(page.locator('.toc__seen')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.toc__seen')).toHaveCount(1);
});

test('T1409 the book works with storage blocked', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('storage is blocked');
      },
    });
  });
  const page = await context.newPage();
  const errors = watchConsole(page);
  await page.goto('/#/ch3-solow');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.boundary')).toHaveCount(0);
  expect(errors.filter((e) => e.includes('storage is blocked'))).toEqual([]);
  await context.close();
});

test('T1410 a damaged link degrades to the defaults', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/#/ch3-solow?s=v1.@@@not-a-payload');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.boundary')).toHaveCount(0);
  await expect(page.locator('.loop__tag--stabilizing')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('T1508 no chapter scrolls sideways at 200% zoom', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  for (const id of CHAPTERS) {
    await page.goto(`/#/${id}`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${id} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});

test('T1412 the book still opens with the network gone', async ({ page, context }) => {
  await page.goto('/#/ch3-solow');
  await expect(page.locator('h1')).toBeVisible();
  // Give the service worker a moment to take control and fill its cache.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
    timeout: 10_000,
  });
  // The first load happens before the worker controls the page, so its assets
  // never pass through the cache. One reload while online fixes that, and is
  // what a real second visit looks like.
  await page.goto('/#/ch2-production');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toContainText('A model of production');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toContainText('A model of production');
  await expect(page.locator('.boundary')).toHaveCount(0);
  await expect(page.locator('.invariants li')).not.toHaveCount(0);
  await context.setOffline(false);
});

test('T1413 the case study runs across every chapter', async ({ page }) => {
  const parts = [
    ['ch0-kernel', 'A briefing note from Verano'],
    ['ch1-measurement', 'The accounts do not close'],
    ['ch2-production', 'The sovereign fund proposal'],
    ['ch3-solow', 'The National Investment Plan'],
  ] as const;

  for (const [chapter, title] of parts) {
    await page.goto(`/#/${chapter}`);
    await expect(page.locator('.case__title', { hasText: title })).toBeVisible();
  }

  // Every figure in the case is computed, so none of them can read as a blank.
  const figures = page.locator('.case__figure dd');
  expect(await figures.count()).toBeGreaterThan(0);
  for (const text of await figures.allTextContents()) {
    expect(text.trim(), 'a case figure rendered empty').not.toBe('');
    expect(text.trim(), 'a case figure failed to resolve').not.toBe('—');
  }
});

test('T1413b loading Verano’s published figures breaks exactly one identity', async ({ page }) => {
  await page.goto('/#/ch1-measurement');
  await page.getByRole('button', { name: 'load Verano’s published figures' }).click();
  await expect(page.locator('.invariants li.bad')).toHaveCount(1);
  await expect(page.locator('.reconcile__head')).toContainText('Spending equals earning');
});

test('T1417 every contents link reaches a real section', async ({ page }) => {
  // The rail lists sections per chapter. Each entry must scroll to something
  // that exists — a link to a missing anchor is silent, which is how the case
  // entries were dead without anyone noticing.
  // Wide enough for the contents rail; the narrow case is covered below.
  await page.setViewportSize({ width: 1500, height: 900 });
  for (const id of CHAPTERS) {
    await page.goto(`/#/${id}`);
    const links = page.locator('.rail .sections__link');
    const count = await links.count();
    expect(count, `${id} lists no sections`).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const before = await page.evaluate(() => window.scrollY);
      await links.nth(i).click();
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => window.scrollY);
      const atBottom = await page.evaluate(
        () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
      );
      const label = await links.nth(i).textContent();
      // Either the page moved, or it was already showing that section.
      expect(
        after !== before || before === 0 || atBottom,
        `${id}: "${label?.trim()}" did not go anywhere`,
      ).toBe(true);
    }
  }
});

test('T1417b the case study is reachable from the contents rail', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto('/#/ch2-production');
  await expect(page.locator('#case')).toHaveCount(1);
  await page.locator('.rail .sections__link', { hasText: 'Case' }).click();
  await page.waitForTimeout(800);

  // The case sits near the end of the chapter, so the document bottoms out
  // before its heading reaches the top. What matters is that the page moved and
  // the case is on screen.
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const box = await page.locator('#case').boundingBox();
  const height = page.viewportSize()!.height;
  expect(box!.y, 'the case is off screen').toBeLessThan(height);
  expect(box!.y + box!.height, 'the case starts above the viewport').toBeGreaterThan(0);
});

test('T1417c navigation survives a narrow window', async ({ page }) => {
  // The rail hides below 1280. Something has to take its place, or a reader on
  // a common laptop width has no way to reach a section at all.
  await page.setViewportSize({ width: 1180, height: 900 });
  await page.goto('/#/ch3-solow');
  await expect(page.locator('.rail')).toBeHidden();

  const inline = page.locator('.railmini .sections__link');
  expect(await inline.count()).toBeGreaterThan(0);
  await inline.filter({ hasText: 'Case' }).click();
  await page.waitForTimeout(800);

  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const box = await page.locator('#case').boundingBox();
  expect(box!.y, 'the case is off screen on a narrow window').toBeLessThan(
    page.viewportSize()!.height,
  );
});

test('T1418 the symbol sheet shows only notation the reader has met', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });

  // Chapter 0 introduces the bathtub, so litres belong there.
  await page.goto('/#/ch0-kernel');
  const early = await page.locator('.symbols li').count();
  await expect(page.locator('.symbols__name', { hasText: 'Water in the tub' })).toHaveCount(1);
  await expect(page.locator('.symbols__name', { hasText: 'Total factor productivity' })).toHaveCount(0);

  // Chapter 3 has met everything, so the sheet is strictly larger.
  await page.goto('/#/ch3-solow');
  const late = await page.locator('.symbols li').count();
  expect(late).toBeGreaterThan(early);
  await expect(page.locator('.symbols__name', { hasText: 'Total factor productivity' })).toHaveCount(1);
});
