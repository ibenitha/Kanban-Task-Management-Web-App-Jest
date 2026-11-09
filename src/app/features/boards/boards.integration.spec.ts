import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Store, provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { firstValueFrom, of } from 'rxjs';
import { API_ENDPOINTS } from '../../core/api/api.config';
import { Board } from '../../core/models/board.model';
import { Task } from '../../core/models/task.model';
import { NotificationService } from '../../core/services/notification/notification.service';
import { BoardListComponent } from './pages/board-list/board-list.component';
import { BoardOverviewComponent } from './pages/board-overview/board-overview.component';
import * as BoardsActions from './state/boards.actions';
import { BoardsEffects } from './state/boards.effects';
import { boardsReducer } from './state/boards.reducer';
import { boardsFeatureKey } from './state/boards.state';

// TESTING LAB: integration tests.
// Unlike the unit tests, nothing here is mocked except the network: the REAL
// Store, reducer, effects, services and components work together, and
// HttpTestingController plays the server. This proves the whole chain works:
//   component → action → effect → service → HTTP → reducer → selector → UI

// Two components on one page, both reading the same shared Store.
@Component({
  standalone: true,
  imports: [BoardListComponent, BoardOverviewComponent],
  template: `<app-board-list></app-board-list><app-board-overview></app-board-overview>`,
})
class HostComponent {}

const boards: Board[] = [
  { id: 1, name: 'Website Redesign', description: '', accent: '#000', members: [], updatedAt: 1 },
];
const tasks: Task[] = [
  {
    id: 10,
    boardId: 1,
    title: 'Design homepage',
    description: '',
    status: 'todo',
    priority: 'high',
    assignee: '',
    dueDate: '',
    tags: [],
  },
  {
    id: 11,
    boardId: 1,
    title: 'Write copy',
    description: '',
    status: 'completed',
    priority: 'low',
    assignee: '',
    dueDate: '',
    tags: [],
  },
];

describe('Boards feature (integration)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let http: HttpTestingController;
  let store: Store;

  const page = () => fixture.nativeElement as HTMLElement;
  const progress = () => page().querySelector('.progress-label')?.textContent?.trim();
  const column = (name: string) => page().querySelector(`[aria-label="${name} column"]`)!;

  // Answers the two GET requests the page sends on load.
  function respondWithBoardData(): void {
    http.expectOne(API_ENDPOINTS.boards).flush(boards);
    http.expectOne(API_ENDPOINTS.tasks).flush(tasks);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // The same Store setup the real BoardsModule uses.
        provideStore(),
        provideState(boardsFeatureKey, boardsReducer),
        provideEffects(BoardsEffects),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ boardId: '1' })),
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(Store);
    jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  // Fails the test if any request was sent that the test didn't expect.
  afterEach(() => http.verify());

  it('loads data once, even though both components ask for it', () => {
    expect(page().textContent).toContain('Loading boards…');

    respondWithBoardData(); // expectOne() fails if a second GET was sent

    expect(page().querySelector('.board-card h2')?.textContent).toContain('Website Redesign');
    expect(progress()).toBe('1/2 tasks done');
    expect(column('To Do').textContent).toContain('Design homepage');
  });

  it('keeps both components in sync after a task is saved', () => {
    respondWithBoardData();

    // The user marks "Design homepage" as completed (as TaskDetailsComponent would).
    store.dispatch(BoardsActions.updateTask({ task: { ...tasks[0], status: 'completed' } }));

    const put = http.expectOne(`${API_ENDPOINTS.tasks}/10`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.status).toBe('completed');
    put.flush({ ...tasks[0], status: 'completed' });
    fixture.detectChanges();

    // One server response, two components updated.
    expect(column('Completed').textContent).toContain('Design homepage');
    expect(column('To Do').textContent).not.toContain('Design homepage');
    expect(progress()).toBe('2/2 tasks done');
  });

  it('creates a board through the form and shows it from the server response', async () => {
    respondWithBoardData();

    const nameInput = page().querySelector('#new-board-name') as HTMLInputElement;
    nameInput.value = 'Launch Plan';
    nameInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    page().querySelector('form.create-section')!.dispatchEvent(new Event('submit'));

    const post = http.expectOne(API_ENDPOINTS.boards);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(expect.objectContaining({ name: 'Launch Plan' }));
    post.flush({ ...post.request.body, id: 2 }); // the server assigns the id
    fixture.detectChanges();

    const names = Array.from(page().querySelectorAll('.board-card h2')).map((h) =>
      h.textContent?.trim(),
    );
    expect(names).toContain('Launch Plan');
  });

  it('shows the error and a toast when the server is unreachable', async () => {
    const notifications = TestBed.inject(NotificationService);
    const unreachable = new ProgressEvent('error'); // status 0 = no connection

    // GET /boards fails, is retried once (retry(1)), then fails again.
    http.expectOne(API_ENDPOINTS.boards).error(unreachable);
    http.expectOne(API_ENDPOINTS.boards).error(unreachable);
    fixture.detectChanges();

    // forkJoin gives up on the whole load, so the parallel GET /tasks is cancelled.
    expect(http.expectOne(API_ENDPOINTS.tasks).cancelled).toBe(true);

    expect(page().querySelector('[role="alert"]')?.textContent).toContain(
      'The server is unreachable',
    );
    expect(page().textContent).toContain('Retry');
    expect(await firstValueFrom(notifications.notification$)).toEqual(
      expect.objectContaining({ type: 'error' }),
    );
  });
});
