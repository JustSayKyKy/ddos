import { describe, it, expect } from 'vitest';
import { getUpcomingDates, RecurrenceRuleError } from '../recurrence';

describe('getUpcomingDates', () => {
  it('null / undefined / empty → []', () => {
    expect(getUpcomingDates(null, '2026-09-04', 14)).toEqual([]);
    expect(getUpcomingDates(undefined, '2026-09-04', 14)).toEqual([]);
    expect(getUpcomingDates('', '2026-09-04', 14)).toEqual([]);
  });

  it('DAILY from today inclusive, horizonDays=3', () => {
    expect(getUpcomingDates('DAILY', '2026-09-04', 3))
      .toEqual(['2026-09-04', '2026-09-05', '2026-09-06']);
  });

  it('DAILY horizonDays=0 → []', () => {
    expect(getUpcomingDates('DAILY', '2026-09-04', 0)).toEqual([]);
  });

  it('DAILY across month boundary', () => {
    expect(getUpcomingDates('DAILY', '2026-09-29', 4))
      .toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  });

  it('WEEKLY:MON,WED,FRI — 2026-09-04 is Friday → Fri,Mon,Wed,Fri,Mon...', () => {
    // 2026-09-04 = Friday. Days: 04 Fri, 05 Sat, 06 Sun, 07 Mon, 08 Tue, 09 Wed, 10 Thu, 11 Fri.
    expect(getUpcomingDates('WEEKLY:MON,WED,FRI', '2026-09-04', 8))
      .toEqual(['2026-09-04', '2026-09-07', '2026-09-09', '2026-09-11']);
  });

  it('WEEKLY with all 7 days == DAILY', () => {
    const a = getUpcomingDates('WEEKLY:MON,TUE,WED,THU,FRI,SAT,SUN', '2026-09-04', 7);
    const b = getUpcomingDates('DAILY', '2026-09-04', 7);
    expect(a).toEqual(b);
  });

  it('WEEKLY case-insensitive and trims spaces', () => {
    expect(getUpcomingDates('weekly: mon , fri', '2026-09-04', 8))
      .toEqual(['2026-09-04', '2026-09-07', '2026-09-11']);
  });

  it('WEEKLY deduplicates repeated weekdays', () => {
    expect(getUpcomingDates('WEEKLY:MON,MON,WED', '2026-09-07', 7))
      .toEqual(['2026-09-07', '2026-09-09']);
  });

  it('throws RecurrenceRuleError on garbage', () => {
    expect(() => getUpcomingDates('EVERY_OTHER_DAY', '2026-09-04', 3)).toThrow(RecurrenceRuleError);
    expect(() => getUpcomingDates('WEEKLY:XYZ', '2026-09-04', 3)).toThrow(RecurrenceRuleError);
    expect(() => getUpcomingDates('WEEKLY:', '2026-09-04', 3)).toThrow(RecurrenceRuleError);
  });

  it('throws on bad today format', () => {
    expect(() => getUpcomingDates('DAILY', '04/09/2026', 3)).toThrow(RecurrenceRuleError);
  });

  it('throws on negative horizonDays', () => {
    expect(() => getUpcomingDates('DAILY', '2026-09-04', -1)).toThrow(/horizonDays/);
  });
});