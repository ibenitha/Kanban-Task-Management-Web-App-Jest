import { TestBed } from '@angular/core/testing';
import { firstValueFrom, take, toArray } from 'rxjs';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('starts with no notification', async () => {
    expect(await firstValueFrom(service.notification$)).toBeNull();
  });

  it('publishes a success notification', async () => {
    service.success('Board created.');
    expect(await firstValueFrom(service.notification$)).toEqual({
      type: 'success',
      message: 'Board created.',
    });
  });

  it('publishes an error notification', async () => {
    service.error('Could not save.');
    expect(await firstValueFrom(service.notification$)).toEqual({
      type: 'error',
      message: 'Could not save.',
    });
  });

  it('clears the current notification', async () => {
    service.success('Task added.');
    service.clear();
    expect(await firstValueFrom(service.notification$)).toBeNull();
  });

  it('replays the latest value to a new subscriber (BehaviorSubject semantics)', async () => {
    service.success('First');
    service.error('Second');

    const values = await firstValueFrom(service.notification$.pipe(take(1), toArray()));
    expect(values).toEqual([{ type: 'error', message: 'Second' }]);
  });

  // TESTING LAB: asynchronous behaviour tested with Jest fake timers.
  // jest.advanceTimersByTime() moves a fake clock forward instantly, so the
  // test doesn't really wait 4 seconds and the result is always the same.
  describe('auto-dismiss (fake timers)', () => {
    const latest = () => firstValueFrom(service.notification$);

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('hides a success notification after AUTO_DISMISS_MS', async () => {
      service.success('Task saved.');

      jest.advanceTimersByTime(NotificationService.AUTO_DISMISS_MS - 1);
      expect(await latest()).toEqual({ type: 'success', message: 'Task saved.' });

      jest.advanceTimersByTime(1);
      expect(await latest()).toBeNull();
    });

    it('keeps an error notification until it is dismissed', async () => {
      service.error('Could not save.');

      jest.advanceTimersByTime(NotificationService.AUTO_DISMISS_MS * 5);

      expect(await latest()).toEqual({ type: 'error', message: 'Could not save.' });
    });

    it('does not let an old timer close a newer message', async () => {
      service.success('First');
      jest.advanceTimersByTime(3000);
      service.error('Second');

      jest.advanceTimersByTime(3000); // the first timer would have fired here

      expect(await latest()).toEqual({ type: 'error', message: 'Second' });
    });

    it('cancels the pending timer when cleared manually', () => {
      service.success('Saved.');
      service.clear();

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
