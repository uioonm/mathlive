import '../src/core/math-environment';
import '../src/latex-commands/definitions';
import '../src/core/modes';

import { Atom } from '../src/core/atom-class';
import { fromJson } from '../src/core/atom';
import { Context } from '../src/core/context';
import { getDefaultContext } from '../src/core/context-utils';
import { parseLatex } from '../src/core/parser';
import { Mode } from '../src/core/modes-utils';

const EMPTY_COMMAND_ARGUMENTS = [
  '\\mathrm',
  '\\mathrm{}',
  '\\mathbf{}',
  '\\mathit{}',
  '\\mathnormal{}',
  '\\mathbfit{}',
  '\\mathsf{}',
  '\\mathtt{}',
  '\\mathbb{}',
  '\\mathfrak{}',
  '\\mathcal{}',
  '\\mathscr{}',
  '\\boldsymbol{}',
  '\\bm{}',
  '\\bold{}',
  '\\bf{}',
  '\\bfseries{}',
  '\\mdseries{}',
  '\\upshape{}',
  '\\slshape{}',
  '\\scshape{}',
  '\\text{}',
  '\\textbf{}',
  '\\textmd{}',
  '\\textup{}',
  '\\textnormal{}',
  '\\textsl{}',
  '\\textit{}',
  '\\textsc{}',
  '\\textrm{}',
  '\\textsf{}',
  '\\texttt{}',
  '\\Bbb{}',
  '\\frak{}',
  '\\textcolor{red}{}',
  '\\colorbox{yellow}{}',
  '\\mbox{}',
  '\\ensuremath{}',
  '\\boxed{}',
  '\\operatorname{}',
  '\\overline{}',
  '\\underline{}',
  '\\vec{}',
];

function renderLatex(latex: string, preserveEmptySlots: boolean): string {
  const context = new Context({
    from: { ...getDefaultContext(), preserveEmptySlots },
  });
  const root = new Atom({
    type: 'root',
    mode: 'math',
    body: parseLatex(latex, { context, parseMode: 'math' }),
  });

  return root.render(context)?.toMarkup() ?? '';
}

function emptySlotCount(latex: string): number {
  return renderLatex(latex, true).match(/ML__empty-slot/g)?.length ?? 0;
}

function serialize(latex: string): string {
  const context = new Context({
    from: { ...getDefaultContext(), preserveEmptySlots: true },
  });
  return Atom.serialize(parseLatex(latex, { context, parseMode: 'math' }), {
    defaultMode: 'math',
  });
}

describe('preserveEmptySlots', () => {
  test.each(EMPTY_COMMAND_ARGUMENTS)(
    '%p keeps its empty command argument editable',
    (latex) => {
      expect(emptySlotCount(latex)).toBe(1);
    }
  );

  test.each(EMPTY_COMMAND_ARGUMENTS)(
    '%p remains editable after a LaTeX round trip',
    (latex) => {
      expect(emptySlotCount(serialize(latex))).toBe(1);
    }
  );

  test.each(['', '{}', 'a{}c'])(
    '%p does not turn a structural empty group into an input slot',
    (latex) => {
      expect(emptySlotCount(latex)).toBe(0);
    }
  );

  test.each([
    '\\mathrm{x}',
    '\\text{if }',
    '\\textcolor{red}{x}',
    '\\colorbox{yellow}{x}',
  ])('%p renders unchanged when empty slots are enabled', (latex) => {
    expect(renderLatex(latex, true)).toBe(renderLatex(latex, false));
  });

  test.each(['\\frac{}{}', '\\sqrt[]{}', '\\ddot{}'])(
    '%p keeps all semantic empty branches editable',
    (latex) => {
      const expectedSlots = latex.startsWith('\\ddot') ? 1 : 2;
      expect(emptySlotCount(latex)).toBe(expectedSlots);
    }
  );

  test.each([
    '\\mathrm{}',
    '\\text{}',
    '\\textcolor{red}{}',
    '\\colorbox{yellow}{}',
  ])('%p preserves its empty argument in LaTeX', (latex) => {
    expect(serialize(latex)).toBe(latex);
  });

  test.each(['\\textbf{x}', '\\textsc{x}', '\\texttt{x}'])(
    '%p does not duplicate its owned text style',
    (latex) => {
      expect(serialize(latex)).toBe(latex);
    }
  );

  test('command argument ownership survives an atom-tree round trip', () => {
    const context = new Context({
      from: { ...getDefaultContext(), preserveEmptySlots: true },
    });
    const [group] = parseLatex('\\mathrm{}', {
      context,
      parseMode: 'math',
    });
    const restored = fromJson(group.toJson());
    const root = new Atom({ type: 'root', mode: 'math', body: [restored] });

    expect(root.render(context)?.toMarkup()).toContain('ML__empty-slot');
    expect(restored.body![0].style.variant).toBe('normal');
    expect(Atom.serialize([restored], { defaultMode: 'math' })).toBe(
      '\\mathrm{}'
    );
  });

  test('typing into a preserved command argument hides the empty slot', () => {
    const context = new Context({
      from: { ...getDefaultContext(), preserveEmptySlots: true },
    });
    const [group] = parseLatex('\\mathrm{}', {
      context,
      parseMode: 'math',
    });
    const letter = Mode.createAtom('math', 'x');
    expect(letter).not.toBeNull();
    group.addChild(letter!, 'body');

    const root = new Atom({ type: 'root', mode: 'math', body: [group] });

    expect(root.render(context)?.toMarkup()).not.toContain('ML__empty-slot');
    expect(Atom.serialize([group], { defaultMode: 'math' })).toBe(
      '\\mathrm{x}'
    );
  });

  test.each([
    ['\\mathrm{x}', 'math', 'normal'],
    ['\\text{x}', 'text', undefined],
  ] as const)(
    'deleting the content of %p restores its styled input slot',
    (latex, mode, variant) => {
      const context = new Context({
        from: { ...getDefaultContext(), preserveEmptySlots: true },
      });
      const [group] = parseLatex(latex, { context, parseMode: 'math' });
      expect(group.type).toBe('group');
      group.removeChild(group.body![1]);

      expect(group.body![0].mode).toBe(mode);
      expect(group.body![0].style.variant).toBe(variant);
      expect(
        emptySlotCount(Atom.serialize([group], { defaultMode: 'math' }))
      ).toBe(1);
    }
  );
});
