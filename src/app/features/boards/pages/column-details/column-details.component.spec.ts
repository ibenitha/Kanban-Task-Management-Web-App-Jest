import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, of } from 'rxjs';
import { Task } from '../../../../core/models/task.model';
import { boardsFeatureKey, initialBoardsState } from '../../state/boards.state';
import { ColumnDetailsComponent } from './column-details.component';

const tasks: Task[] = [
  { id: 1, boardId: 1, title: 'A', description: '', status: 'todo', priority: 'low', assignee: '', dueDate: '', tags: [] },
  { id: 2, boardId: 1, title: 'B', description: '', status: 'in-progress', priority: 'low', assignee: '', dueDate: '', tags: [] },
];

describe('ColumnDetailsComponent', () => {
  async function createWith(columnId: string) {
    await TestBed.configureTestingModule({
      imports: [ColumnDetailsComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [boardsFeatureKey]: { ...initialBoardsState, tasks } } }),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ boardId: '1', columnId })) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ColumnDetailsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = await createWith('todo');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows only the tasks belonging to the selected column', async () => {
    const fixture = await createWith('todo');
    const shown = await firstValueFrom(fixture.componentInstance.tasks$);
    expect(shown.every((t) => t.status === 'todo' && t.boardId === 1)).toBe(true);
    expect(shown.map((t) => t.id)).toEqual([1]);
  });

  it('redirects to /not-found for an unknown column id', async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnDetailsComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [boardsFeatureKey]: { ...initialBoardsState, tasks } } }),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ boardId: '1', columnId: 'made-up-column' })),
          },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(ColumnDetailsComponent);
    fixture.detectChanges(); // triggers ngOnInit -> the redirect

    expect(navigateSpy).toHaveBeenCalledWith(['/not-found']);
  });
});
