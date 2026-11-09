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

    expect(dispatchSpy).toHaveBeenCalledWith(
      BoardsActions.deleteTask({ boardId: 1, taskId: 1 }),
    );
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
});
