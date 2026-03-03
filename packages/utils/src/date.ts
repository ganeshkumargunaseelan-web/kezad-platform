/**
 * Date utilities — all dates stored and processed as UTC.
 * Timezone: UAE = UTC+4
 */
import {
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  differenceInDays,
  addDays,
  addMonths,
  addYears,
  isAfter,
  isBefore,
  parseISO,
  formatISO,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const UAE_TIMEZONE = 'Asia/Dubai'; // UTC+4, no DST

/** Get current UTC timestamp */
export function nowUtc(): Date {
  return new Date();
}

/** Convert UTC date to UAE local time */
export function toUaeTime(utcDate: Date): Date {
  return toZonedTime(utcDate, UAE_TIMEZONE);
}

/** Convert UAE local time to UTC */
export function fromUaeTime(uaeDate: Date): Date {
  return fromZonedTime(uaeDate, UAE_TIMEZONE);
}

/** Get start of month in UTC */
export function monthStart(year: number, month: number): Date {
  return startOfMonth(new Date(year, month - 1, 1));
}

/** Get end of month in UTC */
export function monthEnd(year: number, month: number): Date {
  return endOfMonth(new Date(year, month - 1, 1));
}

/** Number of days in a given month */
export function daysInMonth(year: number, month: number): number {
  return getDaysInMonth(new Date(year, month - 1, 1));
}

/** Days between two dates (inclusive start, exclusive end) */
export function daysBetween(start: Date, end: Date): number {
  return Math.abs(differenceInDays(end, start));
}

/** Check if a notice was given at least N days before effective date */
export function checkNoticeRequirement(
  noticeDateSent: Date,
  effectiveDate: Date,
  requiredDays: number,
): { isValid: boolean; daysDiff: number } {
  const daysDiff = differenceInDays(effectiveDate, noticeDateSent);
  return { isValid: daysDiff >= requiredDays, daysDiff };
}

/** Format date as ISO 8601 UTC string */
export function toIsoUtc(date: Date): string {
  return formatISO(date, { representation: 'complete' });
}

/** Parse ISO string to Date */
export function fromIso(isoString: string): Date {
  return parseISO(isoString);
}

/** Generate array of month periods between start and end dates */
export function getMonthPeriods(
  startDate: Date,
  endDate: Date,
): Array<{ year: number; month: number; start: Date; end: Date; days: number }> {
  const periods: Array<{ year: number; month: number; start: Date; end: Date; days: number }> = [];
  let current = startOfMonth(startDate);

  while (isBefore(current, endDate) || current.getTime() === startOfMonth(endDate).getTime()) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const periodStart = current > startDate ? current : startDate;
    const periodEnd = endOfMonth(current) < endDate ? endOfMonth(current) : endDate;

    periods.push({
      year,
      month,
      start: periodStart,
      end: periodEnd,
      days: daysBetween(periodStart, periodEnd) + 1,
    });

    current = addMonths(current, 1);
    if (isAfter(current, endDate)) break;
  }

  return periods;
}

export { addDays, addMonths, addYears, isAfter, isBefore, parseISO };
