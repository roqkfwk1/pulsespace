import { parseISO } from 'date-fns';

// Spring Boot LocalDateTime은 타임존 없이 반환됨 → 그대로 파싱 (로컬 시간으로 해석)
// 'Z'를 붙이면 UTC로 착각해 +9h 이중 적용되는 문제 발생
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  return parseISO(dateStr);
}

/** KST 시간 포맷 (오후 2:30) */
export function formatTime(dateStr: string): string {
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  });
}

/** KST 날짜 포맷 (2월 26일) — 날짜 구분선용 */
export function formatDate(dateStr: string): string {
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });
}

/** KST 기준 YYYY-MM-DD 문자열 (날짜 비교용) */
export function getKSTDateStr(dateStr: string): string {
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return '';
  // en-CA 로케일은 YYYY-MM-DD 형식 보장
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

/** 오늘(KST) 날짜인지 확인 */
export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  return getKSTDateStr(dateStr) === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

/** 두 타임스탬프 간 차이 (분 단위) */
export function minutesDiff(dateStr1: string, dateStr2: string): number {
  const d1 = parseDate(dateStr1);
  const d2 = parseDate(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.abs(d2.getTime() - d1.getTime()) / (60 * 1000);
}
