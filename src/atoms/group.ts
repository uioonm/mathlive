import type { ParseMode } from '../public/core-types';

import { Atom } from '../core/atom-class';
import type { Context } from '../core/context';
import type { Box } from '../core/box';
import type {
  AtomJson,
  BoxType,
  Branch,
  PrivateStyle,
  ToLatexOptions,
} from '../core/types';
import { getDefinition } from '../latex-commands/definitions-utils';

export class GroupAtom extends Atom {
  private boxType?: BoxType;

  constructor(
    arg: readonly Atom[],
    mode: ParseMode,
    commandArgument?: {
      outerMode: ParseMode;
      prefix: string;
      style: PrivateStyle;
    }
  ) {
    super({
      type: 'group',
      mode: commandArgument?.outerMode ?? mode,
      commandArgumentPrefix: commandArgument?.prefix,
      commandArgumentMode: commandArgument ? mode : undefined,
      commandArgumentStyle: commandArgument?.style,
      // Command-owned groups such as `\mathrm{...}` are editable scopes.
      // Reuse the standard caret-scope highlight used by fences and fractions,
      // while keeping ordinary structural `{...}` groups visually neutral.
      displayContainsHighlight: commandArgument !== undefined,
    });
    this.body = arg;

    // Non-empty groups introduce a break in the
    // inter-box spacing. Empty groups (`{}`) do not.
    this.boxType = arg.length > 1 ? 'ord' : 'ignore';

    // Structural groups hide their visually duplicated inner boundaries.
    // A command argument is an explicit editing scope, so its first and last
    // caret positions must remain reachable with the arrow keys.
    this.skipBoundary = commandArgument === undefined;

    // French decimal point, i.e. `{,}`
    if (arg?.length === 1 && arg[0].command === ',')
      this.captureSelection = true;
  }

  static fromJson(json: AtomJson): GroupAtom {
    const result = new GroupAtom(
      json.body,
      json.commandArgumentMode ?? json.mode,
      json.commandArgumentPrefix === undefined
        ? undefined
        : {
            outerMode: json.mode,
            prefix: json.commandArgumentPrefix,
            style: json.commandArgumentStyle ?? {},
          }
    );
    result.style = { ...json.style };
    return result;
  }

  override makeFirstAtom(branch: Branch): Atom {
    const result = super.makeFirstAtom(branch);
    if (branch === 'body' && this.commandArgumentMode !== undefined) {
      result.mode = this.commandArgumentMode;
      result.style = { ...this.commandArgumentStyle };
    }
    return result;
  }

  render(context: Context): Box | null {
    const box = Atom.createBox(context, this.body, { type: this.boxType });
    if (!box) return null;
    if (this.caret) box.caret = this.caret;
    // Need to bind the group so that the DOM element can be matched
    // and the atom iterated recursively. Otherwise, it behaves
    // as if `captureSelection === true`
    return this.bind(context, box);
  }

  _serialize(options: ToLatexOptions): string {
    if (this.commandArgumentPrefix !== undefined) {
      const savedMode = this.mode;
      const savedStyle = this.style;
      this.mode = this.commandArgumentMode ?? this.mode;
      this.style = { ...this.commandArgumentStyle };
      let body: string;
      try {
        body = this.bodyToLatex({ ...options, skipStyles: true });
      } finally {
        this.mode = savedMode;
        this.style = savedStyle;
      }
      return `${this.commandArgumentPrefix}{${body}}${this.supsubToLatex(
        options
      )}`;
    }

    if (
      !(
        options.expandMacro ||
        options.skipStyles ||
        options.skipPlaceholders
      ) &&
      typeof this.verbatimLatex === 'string'
    )
      return this.verbatimLatex;
    const def = getDefinition(this.command, this.mode);
    if (def?.serialize) return def.serialize(this, options);

    return `{${this.bodyToLatex(options)}}`;
  }
}
