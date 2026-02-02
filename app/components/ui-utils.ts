/**
 * Returns the CSS classes for an option button based on its state.
 */
export function getOptionButtonStyles(options: {
  isCorrect: boolean;
  isWrong: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}): string {
  const { isCorrect, isWrong, isSelected, isDisabled } = options;

  const baseStyles = 'w-full text-left px-4 py-3 rounded-lg border-2 transition-colors';

  let stateStyles: string;
  if (isCorrect) {
    stateStyles = 'border-green-500 bg-green-50 dark:bg-green-900/20';
  } else if (isWrong) {
    stateStyles = 'border-red-500 bg-red-50 dark:bg-red-900/20';
  } else if (isSelected) {
    stateStyles = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
  } else {
    stateStyles = 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600';
  }

  const cursorStyles = isDisabled ? 'cursor-default' : 'cursor-pointer';

  return `${baseStyles} ${stateStyles} ${cursorStyles}`;
}

/**
 * Returns the CSS classes for option text based on its state.
 */
export function getOptionTextStyles(options: {
  isCorrect: boolean;
  isWrong: boolean;
}): string {
  const { isCorrect, isWrong } = options;

  if (isCorrect) {
    return 'text-green-800 dark:text-green-400';
  }
  if (isWrong) {
    return 'text-red-800 dark:text-red-400';
  }
  return 'text-zinc-900 dark:text-white';
}
