import { DueLabelPipe } from './due-label.pipe';

// TESTING LAB: a pipe is a plain class, so it's tested directly — no TestBed.
// The clock is frozen with Jest fake timers so "today" is always 10 Sep 2026.
describe('DueLabelPipe', () => {
  const pipe = new DueLabelPipe();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 10, 15, 30)); // 10 Sep 2026, 15:30 local time
  });

  afterEach(() => jest.useRealTimers());

  describe('valid dates', () => {
    it.each([
      ['2026-09-10', 'Due today'],
      ['2026-09-11', 'Due tomorrow'],
      ['2026-09-20', 'Due Sep 20'],
      ['2026-09-09', 'Overdue · Sep 9'],
      ['2025-12-31', 'Overdue · Dec 31'],
    ])('transforms %s into "%s"', (input, expected) => {
      expect(pipe.transform(input)).toBe(expected);
    });

    it('never shows "Overdue" for a completed task', () => {
      expect(pipe.transform('2026-09-01', true)).toBe('Due Sep 1');
    });
  });

  describe('edge cases', () => {
    it.each([null, undefined, '', '   ', 'not-a-date', '10/09/2026', '2026-02-31'])(
      'returns an empty string for %p',
      (input) => {
        expect(pipe.transform(input)).toBe('');
      },
    );

    it('reads YYYY-MM-DD as a local date, not UTC (no off-by-one day)', () => {
      expect(pipe.transform('2026-09-10')).toBe('Due today');
    });
  });

  it('is predictable: the same input always gives the same output', () => {
    expect(pipe.transform('2026-09-20')).toBe(pipe.transform('2026-09-20'));
  });
});
