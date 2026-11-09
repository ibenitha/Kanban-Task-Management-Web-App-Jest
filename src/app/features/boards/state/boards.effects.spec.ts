import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { firstValueFrom, of, ReplaySubject, throwError } from 'rxjs';
import { Board } from '../../../core/models/board.model';
import { Task } from '../../../core/models/task.model';
import { BoardService } from '../../../core/services/board/board.service';
import { TaskService } from '../../../core/services/task/task.service';
import { NotificationService } from '../../../core/services/notification/notification.service';
import * as BoardsActions from './boards.actions';
import { BoardsEffects } from './boards.effects';
import { selectAllTasks, selectBoardsLoaded } from './boards.selectors';
import { boardsFeatureKey, initialBoardsState } from './boards.state';

const board: Board = {
  id: 1,
  name: 'Board',
  description: '',
  accent: '#000',
  members: [],
  updatedAt: 0,
};

const task: Task = {
  id: 1,
  boardId: 1,
  title: 'Task',
  description: '',
  status: 'todo',
  priority: 'low',
  assignee: '',
  dueDate: '',
  tags: [],
};

type Stub = Record<string, ReturnType<typeof jest.fn>>;

describe('BoardsEffects', () => {
  let actions$: ReplaySubject<unknown>;
  let effects: BoardsEffects;
  let boardService: Stub;
  let taskService: Stub;
  let notifications: NotificationService;
  let router: Router;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);

    // The HTTP services are stubbed: these tests check the Effects' logic,
    // while board.service.spec.ts / task.service.spec.ts test the HTTP calls.
    boardService = { getBoards: jest.fn(), createBoard: jest.fn(), deleteBoard: jest.fn() };
    taskService = {
      getTasks: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        BoardsEffects,
        provideRouter([]),
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: { [boardsFeatureKey]: initialBoardsState },
        }),
        { provide: BoardService, useValue: boardService },
        { provide: TaskService, useValue: taskService },
      ],
    });

    effects = TestBed.inject(BoardsEffects);
    notifications = TestBed.inject(NotificationService);
    router = TestBed.inject(Router);
  });

  // overrideSelector() mutates the shared, module-level selector function
  // itself, not just this test's store — reset it so it can't leak.
  afterEach(() => {
    TestBed.inject(MockStore).resetSelectors();
  });

  it('loadBoardData$ fetches boards and tasks and dispatches success', async () => {
    boardService['getBoards'].mockReturnValue(of([board]));
    taskService['getTasks'].mockReturnValue(of([task]));

    actions$.next(BoardsActions.loadBoardData());
    const result = await firstValueFrom(effects.loadBoardData$);

    expect(result).toEqual(BoardsActions.loadBoardDataSuccess({ boards: [board], tasks: [task] }));
  });

  it('loadBoardData$ skips the API when data is already loaded (cache)', () => {
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectBoardsLoaded, true);
    store.refreshState();

    const emitted: unknown[] = [];
    effects.loadBoardData$.subscribe((action) => emitted.push(action));
    actions$.next(BoardsActions.loadBoardData());

    expect(emitted).toEqual([]);
    expect(boardService['getBoards']).not.toHaveBeenCalled();
  });

  it('loadBoardData$ dispatches the service error message on failure', async () => {
    boardService['getBoards'].mockReturnValue(throwError(() => 'Could not load boards.'));
    taskService['getTasks'].mockReturnValue(of([task]));

    actions$.next(BoardsActions.loadBoardData());
    const result = await firstValueFrom(effects.loadBoardData$);

    expect(result).toEqual(BoardsActions.loadBoardDataFailure({ error: 'Could not load boards.' }));
  });

  it('addTask$ dispatches addTaskSuccess with the task returned by the API', async () => {
    taskService['createTask'].mockReturnValue(of(task));

    actions$.next(BoardsActions.addTask({ task }));
    const result = await firstValueFrom(effects.addTask$);

    expect(result).toEqual(BoardsActions.addTaskSuccess({ task }));
  });

  it('addTask$ dispatches addTaskFailure on error', async () => {
    taskService['createTask'].mockReturnValue(throwError(() => 'Could not add the task.'));

    actions$.next(BoardsActions.addTask({ task }));
    const result = await firstValueFrom(effects.addTask$);

    expect(result).toEqual(BoardsActions.addTaskFailure({ error: 'Could not add the task.' }));
  });

  it('updateTask$ sends the full task and dispatches updateTaskSuccess', async () => {
    taskService['updateTask'].mockReturnValue(of(task));

    actions$.next(BoardsActions.updateTask({ task }));
    const result = await firstValueFrom(effects.updateTask$);

    expect(taskService['updateTask']).toHaveBeenCalledWith(task);
    expect(result).toEqual(BoardsActions.updateTaskSuccess({ task }));
  });

  it('deleteTask$ dispatches deleteTaskSuccess on success', async () => {
    taskService['deleteTask'].mockReturnValue(of(undefined));

    actions$.next(BoardsActions.deleteTask({ boardId: 1, taskId: 1 }));
    const result = await firstValueFrom(effects.deleteTask$);

    expect(result).toEqual(BoardsActions.deleteTaskSuccess({ boardId: 1, taskId: 1 }));
  });

  it('deleteBoard$ deletes the board tasks first, then the board', async () => {
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectAllTasks, [task, { ...task, id: 2 }, { ...task, id: 3, boardId: 2 }]);
    store.refreshState();
    taskService['deleteTask'].mockReturnValue(of(undefined));
    boardService['deleteBoard'].mockReturnValue(of(undefined));

    actions$.next(BoardsActions.deleteBoard({ boardId: 1 }));
    const result = await firstValueFrom(effects.deleteBoard$);

    // Only board 1's two tasks are deleted, not board 2's.
    expect(taskService['deleteTask']).toHaveBeenCalledTimes(2);
    expect(boardService['deleteBoard']).toHaveBeenCalledWith(1);
    expect(result).toEqual(BoardsActions.deleteBoardSuccess({ boardId: 1 }));
  });

  it('navigateAfterAddBoard$ navigates to the new board without dispatching', async () => {
    const navigateSpy = jest.spyOn(router, 'navigate');

    actions$.next(BoardsActions.addBoardSuccess({ board }));
    await firstValueFrom(effects.navigateAfterAddBoard$);

    expect(navigateSpy).toHaveBeenCalledWith(['/boards', board.id]);
  });

  it('notifyOnSuccess$ tells the notification service about a successful mutation', async () => {
    const successSpy = jest.spyOn(notifications, 'success');

    actions$.next(BoardsActions.updateTaskSuccess({ task }));
    await firstValueFrom(effects.notifyOnSuccess$);

    expect(successSpy).toHaveBeenCalledWith('Task saved.');
  });

  it('notifyOnFailure$ tells the notification service about a failed mutation', async () => {
    const errorSpy = jest.spyOn(notifications, 'error');

    actions$.next(BoardsActions.updateTaskFailure({ error: 'That task no longer exists.' }));
    await firstValueFrom(effects.notifyOnFailure$);

    expect(errorSpy).toHaveBeenCalledWith('That task no longer exists.');
  });
});
