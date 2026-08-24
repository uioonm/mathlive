import { describe, expect, test } from '@jest/globals';
import {
  getSuggestionInsertionLatex,
  getSuggestionPreviewLatex,
} from '../src/latex-commands/suggestion-preview';

describe('suggestion popover previews', () => {
  test('renders a standalone math symbol directly', () => {
    expect(getSuggestionPreviewLatex('\\alpha')).toBe('\\alpha');
  });

  test('uses the complete example for a text-mode styling command', () => {
    expect(getSuggestionPreviewLatex('\\fontshape')).toBe(
      '\\text{\\fontshape{sc}Don Knuth}'
    );
  });

  test('uses the complete example for a command with required arguments', () => {
    expect(getSuggestionPreviewLatex('\\fcolorbox')).toBe(
      '\\fcolorbox{#cd0030}{#ffd400}{\\char"2B1A}'
    );
  });

  test('does not render a bare style command without a preview template', () => {
    expect(getSuggestionPreviewLatex('\\displaystyle')).toBeNull();
  });

  test('inserts an editable empty content slot for a text-mode command', () => {
    expect(getSuggestionInsertionLatex('\\fontseries')).toBe('\\textbf{}');
    expect(getSuggestionInsertionLatex('\\fontshape')).toBe('\\textsc{}');
    expect(getSuggestionInsertionLatex('\\fontfamily')).toBe('\\texttt{}');
  });

  test('inserts an explicit argument for one-argument font commands', () => {
    expect(getSuggestionInsertionLatex('\\textbf')).toBe('\\textbf{}');
    expect(getSuggestionInsertionLatex('\\textit')).toBe('\\textit{}');
    expect(getSuggestionInsertionLatex('\\mathbb')).toBe('\\mathbb{}');
  });

  test('inserts a standalone math symbol unchanged', () => {
    expect(getSuggestionInsertionLatex('\\alpha')).toBe('\\alpha');
  });

  test('does not insert a command preview example as user content', () => {
    expect(getSuggestionInsertionLatex('\\fcolorbox')).toBe('\\fcolorbox');
  });
});
