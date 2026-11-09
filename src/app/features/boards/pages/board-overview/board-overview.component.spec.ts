import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, of } from 'rxjs';
import { Task } from '../../../../core/models/task.model';
import { boardsFeatureKey, initialBoardsState } from '../../state/boards.state';
import { BoardOverviewComponent } from './board-overview.component';

const tasks: Task[] = [
  { id: 1, boardId: 1, title: 'Todo task', description: '', status: 'todo', priority: 'low', assignee: '', dueDate: '', tags: [] },
  { id: 2, boardId: 1, title: 'Done task', description: '', status: 'completed', priority: 'low', assignee: '', dueDate: '', tags: [] },
  { id: 3, boardId: 2, title: 'Other board', description: '', status: 'todo', priority: 'low', assignee: '', dueDate: '', tags: [] },
];

describe('BoardOverviewComponent', () => {
  let fixture: ComponentFixture<BoardOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardOverviewComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [boardsFeatureKey]: { ...initialBoardsState, tasks } } }),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ boardId: '1' })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardOverviewComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('buckets board 1 tasks into their columns, excluding other boards', async () => {
    const tasksByColumn = await firstValueFrom(fixture.componentInstance.tasksByColumn$);
    expect(tasksByColumn['todo'].map((t) => t.id)).toEqual([1]);
    expect(tasksByColumn['completed'].map((t) => t.id)).toEqual([2]);
    expect(tasksByColumn['todo'].every((t) => t.boardId === 1)).toBe(true);
  });

  // TESTING LAB (bonus): snapshot test. The first run saves the rendered HTML in
  // __snapshots__/; later runs fail if the markup changes unexpectedly. After an
  // intended UI change, update it with: npx jest -u
  it('matches the saved snapshot of the Kanban board', () => {
    expect(fixture.nativeElement).toMatchSnapshot();
  });
});
