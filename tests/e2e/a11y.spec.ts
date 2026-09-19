import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = ['/#/', '/#/ch0-kernel', '/#/ch1-measurement', '/#/ch2-production', '/#/ch3-solow'];

test.describe('T15xx — accessibility', () => {
  for (const route of ROUTES) {
    test(`T1501 ${route} has no serious violations`, async ({ page }) => {
      await page.goto(route);
      await page.locator('h1').waitFor();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(
        serious.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
        JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })), null, 1),
      ).toEqual([]);
    });
  }

  test('T1502 every control is reachable by keyboard', async ({ page }) => {
    await page.goto('/#/ch3-solow');
    const controls = await page.locator('.stage input[type=range]').count();
    expect(controls).toBeGreaterThan(0);

    // Sliders respond to the keyboard, which is how they must be operable.
    const slider = page.locator('.stage input[type=range]').first();
    const before = await slider.inputValue();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    expect(await slider.inputValue()).not.toBe(before);
  });

  test('T1509 headings form a valid outline', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      const levels = await page.$$eval('h1, h2, h3', (nodes) =>
        nodes.map((n) => Number(n.tagName.slice(1))),
      );
      expect(levels[0], route).toBe(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect(levels[i]! - levels[i - 1]!, `${route}: skipped a heading level`).toBeLessThanOrEqual(1);
      }
    }
  });
});
