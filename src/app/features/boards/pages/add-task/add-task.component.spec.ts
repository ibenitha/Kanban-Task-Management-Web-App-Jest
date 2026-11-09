import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import * as BoardsActions from '../../state/boards.actions';
import { boardsFeatureKey, initialBoardsState } from '../../state/boards.state';
import { AddTaskComponent } from './add-task.component';

describe('AddTaskComponent', () => {
  let fixture: ComponentFixture<AddTaskComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTaskComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [boardsFeatureKey]: initialBoardsState } }),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ boardId: '1' }) } },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(AddTaskComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('refuses to submit an empty title', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.titleInvalid).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('dispatches addTask with the trimmed, parsed draft', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    const component = fixture.componentInstance;
    component.draft.title = '  New task  ';
    component.draft.tags = 'design, ux ,  ';

    component.submit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      BoardsActions.addTask({
        task: expect.objectContaining({
          boardId: 1,
          title: 'New task',
          tags: ['design', 'ux'],
        }),
      }),
    );
  });

  // TESTING LAB: the form tested through the page — type, submit, check the result.
  describe('form (template)', () => {
    const page = () => fixture.nativeElement as HTMLElement;
    const submitButton = () => page().querySelector('button[type="submit"]') as HTMLButtonElement;

    async function fill(selector: string, value: string): Promise<void> {
      const field = page().querySelector(selector) as HTMLInputElement | HTMLSelectElement;
      field.value = value;
      field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input'));
      await fixture.whenStable();
    }

    it('sends what the user typed when the form is submitted', async () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      await fill('#new-task-title', 'Write release notes');
      await fill('#new-task-priority', 'low');
      await fill('#new-task-tags', 'docs');
      submitButton().click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        BoardsActions.addTask({
          task: expect.objectContaining({
            boardId: 1,
            title: 'Write release notes',
            priority: 'low',
            tags: ['docs'],
          }),
        }),
      );
    });

    it('shows an accessible "Title is required" message for an empty title', () => {
      submitButton().click();
      fixture.detectChanges();

      const input = page().querySelector('#new-task-title')!;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('new-task-title-error');
      expect(page().querySelector('#new-task-title-error')?.textContent).toContain(
        'Title is required.',
      );
    });

    it('shows "Adding…" and disables the button while saving', () => {
      store.setState({ [boardsFeatureKey]: { ...initialBoardsState, saving: true } });
      fixture.detectChanges();

      expect(submitButton().disabled).toBe(true);
      expect(page().querySelector('[role="status"]')?.textContent).toContain('Adding…');
    });
  });
});
