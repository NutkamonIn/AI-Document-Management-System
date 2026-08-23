export const RETENTION_DAYS = 2;

export function getRemainingHoursText(createdAtStr: string): string {
  const createdDate = new Date(createdAtStr);
  const expiryDate = new Date(createdDate.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  if (diffMs <= 0) return 'หมดอายุแล้ว';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `เหลืออีก ${days} วัน ${remHours} ชม.`;
  }

  return `เหลืออีก ${hours} ชม. ${minutes} นาที`;
}
