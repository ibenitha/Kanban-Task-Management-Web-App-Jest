import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/*
 * Defines the data required to display a notification.
 * `type` determines its success/error style, and `message` is the text shown.
 */
export interface AppNotification {
  type: 'success' | 'error';
  message: string;
}

/*
 * This service demonstrates service-based shared state.
 *
 * Boards and tasks use NgRx because they have several operations and are
 * shared across many components. A toast is simple, temporary UI state, so
 * creating Actions, Reducers, Selectors, and Effects for it would add
 * unnecessary complexity.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /*
   * The BehaviorSubject owns the current notification.
   * It requires an initial value, so null means "no notification."
   *
   * It is private because only this service should call next() and update it.
   */
  private readonly notificationSubject =
    new BehaviorSubject<AppNotification | null>(null);

  /*
   * Components receive a read-only Observable and normally subscribe with
   * the async pipe. asObservable() prevents them from calling next()
   * and modifying the notification directly.
   */
  readonly notification$ =
    this.notificationSubject.asObservable();

  // TESTING LAB: success toasts close themselves after this many milliseconds.
  // Errors stay until the user dismisses them, so they are never missed.
  static readonly AUTO_DISMISS_MS = 4000;

  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  // Publish a success notification, then hide it automatically.
  success(message: string): void {
    this.show({ type: 'success', message });
    this.dismissTimer = setTimeout(() => this.clear(), NotificationService.AUTO_DISMISS_MS);
  }

  // Publish an error notification (stays until dismissed).
  error(message: string): void {
    this.show({ type: 'error', message });
  }

  // Publish null to remove the current notification.
  clear(): void {
    this.cancelTimer();
    this.notificationSubject.next(null);
  }

  // A new notification cancels the previous timer, so an old timer can't
  // close a newer message early.
  private show(notification: AppNotification): void {
    this.cancelTimer();
    this.notificationSubject.next(notification);
  }

  private cancelTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }
}