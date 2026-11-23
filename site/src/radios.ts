/**
 * The keys of a radio group (role="radiogroup" of role="radio" buttons), as WAI-ARIA has them: one
 * Tab stop, the chosen option, and the arrows choose the next or the previous one.
 */
export function radioKeys(event: KeyboardEvent & { currentTarget: HTMLElement }) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;
  const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
  const at = radios.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  event.preventDefault();
  const next = radios[(at + step + radios.length) % radios.length];
  next.focus();
  next.click();
}

/** The Tab stop of a radio group: only its chosen option. */
export const radioTab = (checked: boolean) => (checked ? "0" : "-1");
