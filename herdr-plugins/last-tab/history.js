export function recordFocus(history, focusedId) {
  return [focusedId, ...history.filter((id) => id !== focusedId)];
}

export function lastVisited(history, currentId, availableIds) {
  const available = new Set(availableIds);
  return history.find((id) => id !== currentId && available.has(id));
}
