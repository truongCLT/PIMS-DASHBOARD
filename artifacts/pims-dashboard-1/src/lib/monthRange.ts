export function lastClosedMonth(): number {
  return new Date().getMonth();
}

export function filterUpToLastMonth<T>(data: T[], getMonthLabel: (row: T) => string): T[] {
  const limit = lastClosedMonth();
  return data.filter((row) => {
    const n = parseInt(getMonthLabel(row).replace("월", ""), 10);
    return !Number.isNaN(n) && n >= 1 && n <= limit;
  });
}
