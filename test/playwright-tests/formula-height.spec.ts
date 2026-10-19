import { test, expect } from '@playwright/test';

test('floor delimiters fit the scroll container at different font sizes', async ({
  page,
}) => {
  await page.goto('/dist/playwright-test-page/');
  for (const size of [16, 18, 32, 48]) {
    const geometry = await page
      .locator('#mf-1')
      .evaluate(async (field: any, size) => {
        field.style.fontSize = `${size}px`;
        field.value = String.raw`y_1=u_1-b\cdot\left\lfloor\dfrac{u_1}{b}\right\rfloor`;
        field.focus();
        await document.fonts.ready;
        await new Promise(requestAnimationFrame);
        const content = field.shadowRoot.querySelector('.ML__content');
        return { height: content.clientHeight, scroll: content.scrollHeight };
      }, size);
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.height + 1);
  }
});

test('matrix row metrics do not stretch empty slots', async ({ page }) => {
  await page.goto('/dist/playwright-test-page/');
  const heights = [];
  for (const value of [
    String.raw`\sqrt{}`,
    String.raw`\begin{pmatrix}&\\&\end{pmatrix}`,
  ]) {
    heights.push(
      await page.locator('#mf-1').evaluate(async (field: any, value) => {
        field.preserveEmptySlots = true;
        field.value = value;
        await document.fonts.ready;
        await new Promise(requestAnimationFrame);
        return [...field.shadowRoot.querySelectorAll('.ML__empty-slot')].map(
          (slot: HTMLElement) => slot.getBoundingClientRect().height
        );
      }, value)
    );
  }
  expect(heights[0]).toHaveLength(1);
  expect(heights[1]).toHaveLength(4);
  for (const height of heights[1]) expect(height).toBeCloseTo(heights[0][0], 1);
});
