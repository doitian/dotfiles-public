/**
 * Model-selection CLI option parsing shared by foc and fpi.
 */

/**
 * Find a model option (-m, --model, or --model=) before the `--` separator.
 * @param {string[]} args
 * @param {number} separator Index of `--`, or -1 when absent.
 * @returns {{ index: number, span: number, flag: string, value: string | undefined } | null}
 */
export function findModelOption(args, separator) {
  const limit = separator === -1 ? args.length : separator;
  for (let index = 0; index < limit; index++) {
    const arg = args[index];
    if (arg.startsWith("--model=")) {
      return { index, span: 1, flag: "--model", value: arg.slice("--model=".length) };
    }
    if (arg === "-m" || arg === "--model") {
      return { index, span: 2, flag: arg, value: args[index + 1] };
    }
  }
  return null;
}