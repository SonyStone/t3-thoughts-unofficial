export function hasCardSelection(card: Node) {
  const selection = window.getSelection();
  // either end in the card: a triple click selects its paragraph up to the start of what follows
  return !!selection && !selection.isCollapsed && (card.contains(selection.anchorNode) || card.contains(selection.focusNode));
}
