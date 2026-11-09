import { TestBed } from '@angular/core/testing';
import { unsavedChangesGuard, HasUnsavedChanges } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const runGuard = (component: HasUnsavedChanges) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(component as never, {} as never, {} as never, {} as never),
    );

  it('allows navigation without prompting when there are no unsaved changes', () => {
    const confirmSpy = jest.spyOn(window, 'confirm');
    expect(runGuard({ hasUnsavedChanges: () => false })).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('prompts and respects the answer when there are unsaved changes', () => {
    jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
    expect(runGuard({ hasUnsavedChanges: () => true })).toBe(false);

    jest.spyOn(window, 'confirm').mockReturnValueOnce(true);
    expect(runGuard({ hasUnsavedChanges: () => true })).toBe(true);
  });
});
