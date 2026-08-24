import './definitions';
import '../addons/definitions-metadata';

import { LATEX_COMMANDS, MATH_SYMBOLS } from './definitions-utils';

// These commands change the style of the text that follows them instead of
// producing visible content by themselves. Keep their preview examples out of
// the mathfield and insert an explicit, editable content slot instead.
const SUGGESTION_INSERTION_TEMPLATES = new Map<string, string>([
  ['\\fontseries', '\\textbf{}'],
  ['\\fontfamily', '\\texttt{}'],
  ['\\fontshape', '\\textsc{}'],
  ['\\selectfont', '\\text{}'],
]);

/** Return complete LaTex suitable for a read-only command suggestion preview. */
export function getSuggestionPreviewLatex(suggestion: string): string | null {
  const definition = Object.prototype.hasOwnProperty.call(
    LATEX_COMMANDS,
    suggestion
  )
    ? LATEX_COMMANDS[suggestion]
    : Object.prototype.hasOwnProperty.call(MATH_SYMBOLS, suggestion)
      ? MATH_SYMBOLS[suggestion]
      : undefined;

  // User macros are not registered definitions. Preserve the existing direct
  // rendering behavior because their expansion is only known by the editor.
  if (!definition) return suggestion;

  if (definition.template) return definition.template;
  if (definition.definitionType === 'symbol') return suggestion;

  // A parameterized, mode-limited or style-only command cannot be rendered
  // meaningfully as a standalone formula without an explicit example.
  if (
    definition.params.length > 0 ||
    definition.ifMode !== undefined ||
    (definition.applyStyle !== undefined && definition.createAtom === undefined)
  )
    return null;

  return suggestion;
}

/** Return the valid LaTex inserted when a user accepts a suggestion. */
export function getSuggestionInsertionLatex(suggestion: string): string {
  const explicitTemplate = SUGGESTION_INSERTION_TEMPLATES.get(suggestion);
  if (explicitTemplate) return explicitTemplate;

  const definition = LATEX_COMMANDS[suggestion];
  const argument = definition?.params[0];
  const argumentType = argument?.type.replace(/\*$/, '');

  // Style commands with one text/math argument need an explicit empty group.
  // Without it, accepting (for example) `\textbf` creates the argument lazily;
  // its first typed atoms miss the command style until the value is reparsed.
  if (
    definition?.applyStyle !== undefined &&
    definition.params.length === 1 &&
    argument !== undefined &&
    !argument.isOptional &&
    (argumentType === 'text' || argumentType === 'math')
  )
    return `${suggestion}{}`;

  return suggestion;
}
