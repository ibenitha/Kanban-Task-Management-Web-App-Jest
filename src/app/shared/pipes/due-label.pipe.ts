import { Pipe, PipeTransform } from '@angular/core';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// TESTING LAB: turns a task's due date into a short, friendly label.
//   past            → "Overdue · Sep 10"
//   today/tomorrow  → "Due today" / "Due tomorrow"
//   later           → "Due Sep 10"
//   completed tasks → never "Overdue", just "Due Sep 10"
//   empty/invalid   → "" (the template hides the label)
//
// Usage: {{ task.dueDate | dueLabel: task.status === 'completed' }}
// Pure pipe: Angular only re-runs it when the date or the "done" flag changes.
@Pipe({ name: 'dueLabel', standalone: true })
export class DueLabelPipe implements PipeTransform {
  transform(dueDate: string | null | undefined, done = false): string {
    const due = parseDate(dueDate);
    if (!due) {
      return '';
    }

    const shortDate = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (done) {
      return `Due ${shortDate}`;
    }

    const daysLeft = Math.round((due.getTime() - startOfToday().getTime()) / ONE_DAY_MS);
    if (daysLeft < 0) return `Overdue · ${shortDate}`;
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return `Due ${shortDate}`;
  }
}

// Reads 'YYYY-MM-DD' as a local date. new Date('2026-09-10') would be UTC
// midnight, which shows as the previous day in timezones behind UTC.
function parseDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) {
    return null;
  }
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  // Rejects impossible dates like 2026-02-31, which Date would roll into March.
  return date.getMonth() === month - 1 ? date : null;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
