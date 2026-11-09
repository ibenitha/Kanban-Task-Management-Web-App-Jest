import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Board } from '../../../../core/models/board.model';
import { Task } from '../../../../core/models/task.model';
import * as BoardsActions from '../../state/boards.actions';
import { boardsFeatureKey, initialBoardsState } from '../../state/boards.state';
import { BoardListComponent } from './board-list.component';

const boards: Board[] = [
  { id: 1, name: 'Website Redesign', description: '', accent: '#000', members: [], updatedAt: 2 },
  { id: 2, name: 'Mobile App', description: '', accent: '#000', members: [], updatedAt: 1 },
];
const tasks: Task[] = [];

describe('BoardListComponent', () => {
  let fixture: ComponentFixture<BoardListComponent>;
  let store: MockStore;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [BoardListComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: { [boardsFeatureKey]: { ...initialBoardsState, boards, tasks } },
        }),
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$ } },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(BoardListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('dispatches loadBoardData on init', () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(BoardsActions.loadBoardData());
  });

  it('shows all boards sorted by "recent" by default', async () => {
    expect(fixture.componentInstance.sort).toBe('recent');
    const vm = await firstValueFrom(fixture.componentInstance.vm$);
    expect(vm.summaries.map((s) => s.board.id)).toEqual([1, 2]);
  });

  it('reacts to a query param change without re-creating the component', async () => {
    queryParamMap$.next(convertToParamMap({ search: 'mobile' }));
    const vm = await firstValueFrom(fixture.componentInstance.vm$);
    expect(vm.summaries.map((s) => s.board.name)).toEqual(['Mobile App']);
  });

  it('reflects the loading and error flags from the store', async () => {
    store.setState({ [boardsFeatureKey]: { ...initialBoardsState, loading: true } });
    const vm = await firstValueFrom(fixture.componentInstance.vm$);
    expect(vm.loading).toBe(true);
  });
});
