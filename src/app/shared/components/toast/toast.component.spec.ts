import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';

// TESTING LAB: component fundamentals — initialisation, @Input, @Output and
// template bindings. Tests check what the user sees and does, not internals.
describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let element: HTMLElement;

  // Small helper so each test reads as "given this input, expect this output".
  function show(type: 'success' | 'error', message: string): void {
    fixture.componentRef.setInput('notification', { type, message });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToastComponent);
    element = fixture.nativeElement;
  });

  it('initialises and renders the message it receives', () => {
    show('success', 'Task saved.');

    expect(fixture.componentInstance).toBeTruthy();
    expect(element.querySelector('.toast__message')?.textContent).toBe('Task saved.');
  });

  it('updates the template when the input changes', () => {
    show('success', 'Task saved.');
    show('error', 'Could not save.');

    expect(element.querySelector('.toast__message')?.textContent).toBe('Could not save.');
    expect(element.querySelector('.toast')?.classList).toContain('toast--error');
    expect(element.querySelector('.toast')?.classList).not.toContain('toast--success');
  });

  it('uses role="status" for success and role="alert" for errors', () => {
    show('success', 'Saved.');
    expect(element.querySelector('.toast')?.getAttribute('role')).toBe('status');

    show('error', 'Failed.');
    expect(element.querySelector('.toast')?.getAttribute('role')).toBe('alert');
  });

  it('emits "dismissed" when the × button is clicked', () => {
    show('success', 'Saved.');
    const dismissed = jest.fn();
    fixture.componentInstance.dismissed.subscribe(dismissed);

    (element.querySelector('.toast__dismiss') as HTMLButtonElement).click();

    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('gives the dismiss button an accessible name', () => {
    show('success', 'Saved.');
    expect(element.querySelector('.toast__dismiss')?.getAttribute('aria-label')).toBe(
      'Dismiss notification',
    );
  });
});
