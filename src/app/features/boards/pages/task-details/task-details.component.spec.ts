import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subject, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { Task } from '../../../../core/models/task.model';
import * as BoardsActions from '../../state/boards.actions';
import { boardsFeatureKey, initialBoardsState } from '../../state/boards.state';
import { TaskDetailsComponent } from './task-details.component';

const task: Task = {
  id: 1,
  boardId: 1,
  title: 'Design homepage hero',
  description: '',
  status: 'todo',
  priority: 'high',
  assignee: 'AK',
  dueDate: '2026-09-12',
  tags: ['design'],
};

describe('TaskDetailsComponent', () => {
  let fixture: ComponentFixture<TaskDetailsComponent>;
  let store: MockStore;
  let actions$: Subject<Action>;

  beforeEach(async () => {
    actions$ = new Subject<Action>();

    await TestBed.configureTestingModule({
      imports: [TaskDetailsComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: { [boardsFeatureKey]: { ...initialBoardsState, tasks: [task] } },
        }),
        provideMockActions(() => actions$),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ boardId: '1', taskId: '1' })) },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(TaskDetailsComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads the task matching :boardId and :taskId', () => {
    expect(fixture.componentInstance.task?.title).toBe('Design homepage hero');
  });

  it('reports unsaved changes only once the draft diverges from the loaded task', () => {
    const component = fixture.componentInstance;
    expect(component.hasUnsavedChanges()).toBe(false);

    component.draft.title = 'Something else';
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('dispatches updateTask with the full task on save, and only marks the draft saved once updateTaskSuccess arrives', () => {
    const component = fixture.componentInstance;
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    component.draft.title = 'Renamed';

    component.save();

    // The complete task is sent (PUT replaces the whole record).
    expect(dispatchSpy).toHaveBeenCalledWith(
      BoardsActions.updateTask({ task: { ...task, title: 'Renamed' } }),
    );
    // The click alone doesn't mark it saved — only the *Success action does.
    expect(component.hasUnsavedChanges()).toBe(true);
    expect(component.justSaved).toBe(false);

    // Pushing directly onto the mocked Actions stream simulates
    // BoardsEffects having completed the (real) API call and dispatched
    // the success action.
    actions$.next(BoardsActions.updateTaskSuccess({ task: { ...task, title: 'Renamed' } }));

    expect(component.hasUnsavedChanges()).toBe(false);
    expect(component.justSaved).toBe(true);
  });

  it('refuses to save an empty title', () => {
    const component = fixture.componentInstance;
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    component.draft.title = '   ';

    component.save();

    expect(component.titleInvalid).toBe(true);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('deletes the task after confirmation and treats the draft as saved so the guard does not double-prompt', () => {
    const component = fixture.componentInstance;
    jest.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    component.draft.title = 'Unsaved edit';

    component.deleteTask();

    expect(dispatchSpy).toHaveBeenCalledWith(BoardsActions.deleteTask({ boardId: 1, taskId: 1 }));
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('does not dispatch deleteTask when the user cancels the confirmation', () => {
    const component = fixture.componentInstance;
    jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    component.deleteTask();

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('redirects to /not-found once data has loaded and the task truly does not exist', async () => {
    // The outer beforeEach already instantiated a TestBed environment for
    // this suite's default task — reset it so this test can configure its
    // own (a task list with no matching task).
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TaskDetailsComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: { [boardsFeatureKey]: { ...initialBoardsState, tasks: [], loaded: true } },
        }),
        provideMockActions(() => new Subject<Action>()),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ boardId: '1', taskId: '999' })) },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');
    const missingFixture = TestBed.createComponent(TaskDetailsComponent);
    missingFixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/not-found']);
  });

  // TESTING LAB: the same form, tested through the page the way a user uses it.
  describe('edit form (template)', () => {
    const page = () => fixture.nativeElement as HTMLElement;
    const saveButton = () =>
      Array.from(page().querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Save changes'),
      ) as HTMLButtonElement;

    async function typeTitle(value: string): Promise<void> {
      const input = page().querySelector('#task-title') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    }

    beforeEach(async () => {
      await fixture.whenStable(); // let ngModel copy the task into the inputs
      fixture.detectChanges();
    });

    it('fills the form with the task from the store', () => {
      expect((page().querySelector('#task-title') as HTMLInputElement).value).toBe(
        'Design homepage hero',
      );
      expect((page().querySelector('#task-priority') as HTMLSelectElement).value).toBe('high');
    });

    it('keeps Save disabled until the user changes something', async () => {
      expect(saveButton().disabled).toBe(true);

      await typeTitle('Design homepage hero v2');

      expect(saveButton().disabled).toBe(false);
      expect(page().textContent).toContain('Unsaved changes');
    });

    it('shows an accessible error and does not save when the title is cleared', async () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      await typeTitle('');

      page().querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      const input = page().querySelector('#task-title')!;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('task-title-error');
      expect(page().querySelector('#task-title-error')?.textContent).toContain('required');
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BoardsActions.updateTask.type }),
      );
    });

    it('disables Save and Delete while a request is in progress', async () => {
      await typeTitle('Changed');
      store.setState({
        [boardsFeatureKey]: { ...initialBoardsState, tasks: [task], saving: true },
      });
      fixture.detectChanges();

      const deleteButton = Array.from(page().querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Delete task',
      )!;
      expect(saveButton().disabled).toBe(true);
      expect(deleteButton.disabled).toBe(true);
    });
  });
});
