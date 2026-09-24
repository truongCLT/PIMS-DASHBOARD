export function lastClosedMonth(): number {
  return new Date().getMonth();
}

/**
 * Tháng gần nhất mà dữ liệu thực tế (실적) đã được chốt đầy đủ, theo lịch.
 * Tháng hiện tại luôn coi là CHƯA chốt (đang chạy dở), nên giá trị trả về
 * luôn là tháng trước — kẹp về tối thiểu 1 (tháng 1 đầu năm không có tháng
 * trước đó trong cùng năm báo cáo).
 * Dùng làm chặn trên khi giới hạn lựa chọn 기준월 (base month) trên UI.
 */
export function maxSelectableMonth(): number {
  return Math.max(lastClosedMonth(), 1);
}

export function filterUpToLastMonth<T>(data: T[], getMonthLabel: (row: T) => string): T[] {
  const limit = lastClosedMonth();
  return data.filter((row) => {
    const n = parseInt(getMonthLabel(row).replace("월", ""), 10);
    return !Number.isNaN(n) && n >= 1 && n <= limit;
  });
}
