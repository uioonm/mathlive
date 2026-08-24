import { expect, test } from '@playwright/test';

test('typing into a regular placeholder still replaces it once', async ({
  page,
}) => {
  await page.goto('/dist/playwright-test-page/');

  const field = page.locator('#mf-1');
  await field.evaluate((mathfield: MathfieldElement) => {
    mathfield.value = '\\placeholder{}';
    mathfield.selection = { ranges: [[0, 1]] };
  });
  await field.pressSequentially('x+y');

  await expect(field).toHaveJSProperty('value', 'x+y');
});

for (const { template, expected, styleClass } of [
  {
    template: '\\textbf{}',
    expected: '\\textbf{aaaa}',
    styleClass: 'ML__bold',
  },
  {
    template: '\\textsc{}',
    expected: '\\textsc{aaaa}',
    styleClass: 'ML__shape_sc',
  },
  {
    template: '\\texttt{}',
    expected: '\\texttt{aaaa}',
    styleClass: 'ML__tt',
  },
]) {
  test(`typing into ${template} renders its style immediately`, async ({
    page,
  }) => {
    await page.goto('/dist/playwright-test-page/');

    const field = page.locator('#mf-1');
    await field.evaluate((mathfield: MathfieldElement, value) => {
      mathfield.preserveEmptySlots = true;
      mathfield.insert(value, {
        focus: true,
        selectionMode: 'placeholder',
      });
    }, template);
    await field.pressSequentially('aaaa');

    await expect(field).toHaveJSProperty('value', expected);
    const styledContent = await field
      .locator(`.${styleClass}`)
      .allTextContents({});
    expect(styledContent.join('')).toBe('aaaa');
  });
}

for (const { template, input = 'x', expected, styleClass, renderedText } of [
  {
    template: '\\mathbb{}',
    input: 'aaaa',
    expected: '\\mathbb{aaaa}',
    renderedText: '𝕒𝕒𝕒𝕒',
  },
  {
    template: '\\mathcal{}',
    input: 'X',
    expected: '\\mathcal{X}',
    styleClass: 'ML__cal',
  },
  {
    template: '\\mathfrak{}',
    expected: '\\mathfrak{x}',
    styleClass: 'ML__frak',
  },
  {
    template: '\\mathbf{}',
    expected: '\\mathbf{x}',
    styleClass: 'ML__mathbf',
  },
  {
    template: '\\mathit{}',
    expected: '\\mathit{x}',
    styleClass: 'ML__it',
  },
  {
    template: '\\mathsf{}',
    expected: '\\mathsf{x}',
    styleClass: 'ML__sans',
  },
  {
    template: '\\mathtt{}',
    expected: '\\mathtt{x}',
    styleClass: 'ML__tt',
  },
  {
    template: '\\mathscr{}',
    input: 'X',
    expected: '\\mathscr{X}',
    styleClass: 'ML__script',
  },
]) {
  test(`typing into ${template} renders its math variant immediately`, async ({
    page,
  }) => {
    await page.goto('/dist/playwright-test-page/');

    const field = page.locator('#mf-1');
    await field.evaluate((mathfield: MathfieldElement, value) => {
      mathfield.preserveEmptySlots = true;
      mathfield.insert(value, {
        focus: true,
        selectionMode: 'placeholder',
      });
    }, template);
    await field.locator('.ML__empty-slot').click();
    await field.pressSequentially(input);

    await expect(field).toHaveJSProperty('value', expected);
    if (styleClass)
      await expect(field.locator(`.${styleClass}`)).toHaveCount(1);
    if (renderedText)
      await expect(field.getByText(renderedText, { exact: true })).toHaveCount(
        1
      );
  });
}

test('accepting a font command suggestion inserts an editable styled slot', async ({
  page,
}) => {
  await page.goto('/dist/playwright-test-page/');

  const field = page.locator('#mf-1');
  await field.evaluate((mathfield: MathfieldElement) => {
    mathfield.preserveEmptySlots = true;
  });
  await field.pressSequentially('\\fontseries');
  await field.press('Enter');

  const initialSelection = await field.evaluate(
    (mathfield: MathfieldElement) => mathfield.selection.ranges[0]
  );
  expect(initialSelection[0]).toBe(initialSelection[1]);
  await expect(field.locator('.ML__empty-slot')).toHaveCount(1);
  await expect(field.locator('.ML__empty-slot > .ML__text-caret')).toHaveCount(
    1
  );

  await field.press('ArrowRight');
  const afterSlot = await field.evaluate(
    (mathfield: MathfieldElement) => mathfield.selection.ranges[0]
  );
  await field.press('ArrowLeft');
  const backInSlot = await field.evaluate(
    (mathfield: MathfieldElement) => mathfield.selection.ranges[0]
  );
  expect(afterSlot).not.toEqual(initialSelection);
  expect(backInSlot).toEqual(initialSelection);

  await field.press('ArrowRight');
  const slot = field.locator('.ML__empty-slot');
  await slot.click();
  const clickedSlot = await field.evaluate(
    (mathfield: MathfieldElement) => mathfield.selection.ranges[0]
  );
  expect(clickedSlot).toEqual(initialSelection);
  await expect(slot).toHaveClass(/ML__empty-slot-active/);

  await field.pressSequentially('aaaa');

  await expect(field).toHaveJSProperty('value', '\\textbf{aaaa}');
  const boldText = await field.locator('.ML__bold').allTextContents({});
  expect(boldText.join('')).toBe('aaaa');
});

test('clicking a font command suggestion preserves the inserted text style', async ({
  page,
}) => {
  await page.goto('/dist/playwright-test-page/');

  const field = page.locator('#mf-1');
  await field.evaluate((mathfield: MathfieldElement) => {
    mathfield.preserveEmptySlots = true;
  });
  await field.pressSequentially('\\fontseries');

  const suggestion = page.locator(
    '#mathlive-suggestion-popover [data-command="\\\\fontseries"]'
  );
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await field.pressSequentially('aaaa');

  await expect(field).toHaveJSProperty('value', '\\textbf{aaaa}');
  const boldText = await field.locator('.ML__bold').allTextContents({});
  expect(boldText.join('')).toBe('aaaa');
});

test('accepting textbf directly keeps its argument style while typing', async ({
  page,
}) => {
  await page.goto('/dist/playwright-test-page/');

  const field = page.locator('#mf-1');
  await field.evaluate((mathfield: MathfieldElement) => {
    mathfield.preserveEmptySlots = true;
  });
  await field.pressSequentially('\\textbf');
  await field.press('Enter');
  await expect(field).toHaveJSProperty('value', '\\textbf{}');
  await expect(field).toHaveJSProperty('mode', 'text');
  await expect(field.locator('.ML__empty-slot')).toHaveCount(1);
  await field.pressSequentially('aaaa');

  await expect(field).toHaveJSProperty('value', '\\textbf{aaaa}');
  const boldText = await field.locator('.ML__bold').allTextContents({});
  expect(boldText.join('')).toBe('aaaa');
});

test('an active empty fraction slot does not create vertical overflow', async ({
  page,
}) => {
  await page.goto('/dist/playwright-test-page/');

  const field = page.locator('#mf-1');
  await field.evaluate((mathfield: MathfieldElement) => {
    mathfield.style.cssText =
      'width:100%;min-width:0;box-sizing:border-box;padding:0;border:0;font-size:18px';
    mathfield.preserveEmptySlots = true;
    mathfield.value = '\\frac{}{}';
  });
  await field.locator('.ML__empty-slot').last().click();

  const activeSlotGeometry = await field
    .locator('.ML__empty-slot-active')
    .evaluate((slot) => {
      const slotRect = slot.getBoundingClientRect();
      const caret = slot.querySelector('.ML__caret')!;
      const caretRect = caret.getBoundingClientRect();
      const caretStyle = getComputedStyle(caret, '::after');
      return {
        slotLeft: slotRect.left,
        slotRight: slotRect.right,
        slotHeight: slotRect.height,
        caretLeft: caretRect.left,
        caretHeight: Number.parseFloat(caretStyle.height),
        caretPosition: caretStyle.position,
      };
    });
  expect(activeSlotGeometry.caretLeft).toBeGreaterThanOrEqual(
    activeSlotGeometry.slotLeft
  );
  expect(activeSlotGeometry.caretLeft).toBeLessThan(
    activeSlotGeometry.slotLeft +
      (activeSlotGeometry.slotRight - activeSlotGeometry.slotLeft) / 2
  );
  expect(activeSlotGeometry.caretPosition).toBe('absolute');
  expect(activeSlotGeometry.caretHeight).toBeLessThan(
    activeSlotGeometry.slotHeight
  );

  const overflow = await field.locator('.ML__content').evaluate((content) => ({
    clientHeight: content.clientHeight,
    scrollHeight: content.scrollHeight,
  }));
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight + 1);
});
