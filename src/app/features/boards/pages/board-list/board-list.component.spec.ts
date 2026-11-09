import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
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

  // TESTING LAB: the component depends on Store, Router and window.confirm.
  // All three are replaced with mocks/spies, so the component is tested in
  // isolation: no real HTTP, no real navigation, no real browser dialog.
  describe('UI and mocked dependencies', () => {
    const page = () => fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      Array.from(page().querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
    const submitCreateForm = () =>
      page().querySelector('form.create-section')!.dispatchEvent(new Event('submit'));

    // Types into an input the way a user would, then lets ngModel update.
    async function type(selector: string, value: string): Promise<void> {
      const input = page().querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    }

    it('renders one card per board from the store', () => {
      const names = Array.from(page().querySelectorAll('.board-card h2')).map((h) =>
        h.textContent?.trim(),
      );
      expect(names).toEqual(['Website Redesign', 'Mobile App']);
    });

    it('updates the page when the store state changes', () => {
      store.setState({ [boardsFeatureKey]: { ...initialBoardsState, loading: true } });
      fixture.detectChanges();
      expect(page().textContent).toContain('Loading boards…');
      expect(page().querySelectorAll('.board-card').length).toBe(0);

      store.setState({ [boardsFeatureKey]: { ...initialBoardsState, loaded: true } });
      fixture.detectChanges();
      expect(page().textContent).toContain('No boards yet');
    });

    it('shows the load error with a Retry button that reloads the data', () => {
      store.setState({
        [boardsFeatureKey]: { ...initialBoardsState, error: 'The server is unreachable.' },
      });
      fixture.detectChanges();
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      expect(page().querySelector('[role="alert"]')?.textContent).toContain(
        'The server is unreachable.',
      );
      button('Retry').click();

      expect(dispatchSpy).toHaveBeenCalledWith(BoardsActions.loadBoardData());
    });

    it('creates a board with trimmed values and clears the form', async () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      await type('#new-board-name', '  Launch Plan  ');
      await type('#new-board-description', ' Q4 launch ');
      submitCreateForm();

      expect(dispatchSpy).toHaveBeenCalledWith(
        BoardsActions.addBoard({ name: 'Launch Plan', description: 'Q4 launch' }),
      );
      expect(fixture.componentInstance.newBoardName).toBe('');
      expect(fixture.componentInstance.newBoardDescription).toBe('');
    });

    it('does not create a board when the name is blank', async () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      await type('#new-board-name', '   ');
      submitCreateForm();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('disables the Create board button while a save is in progress', () => {
      store.setState({ [boardsFeatureKey]: { ...initialBoardsState, boards, saving: true } });
      fixture.detectChanges();
      expect(button('Create board').disabled).toBe(true);
    });

    it('deletes a board only after the user confirms', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      (page().querySelector('[aria-label="Delete board Mobile App"]') as HTMLButtonElement).click();

      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Mobile App'));
      expect(dispatchSpy).toHaveBeenCalledWith(BoardsActions.deleteBoard({ boardId: 2 }));
    });

    it('does nothing when the user cancels the delete dialog', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      (page().querySelector('[aria-label="Delete board Mobile App"]') as HTMLButtonElement).click();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('opens a board by navigating to /boards/:id', () => {
      const navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      button('Open board').click();

      expect(navigateSpy).toHaveBeenCalledWith(['/boards', 1]);
    });

    it('writes the search text into the URL query string', async () => {
      const navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      await type('#board-search', 'mobile');

      expect(navigateSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { search: 'mobile' },
          queryParamsHandling: 'merge',
        }),
      );
    });
  });
});
