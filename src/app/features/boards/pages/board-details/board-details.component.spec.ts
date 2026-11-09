import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Board } from '../../../../core/models/board.model';
import { boardsFeatureKey, initialBoardsState } from '../../state/boards.state';
import { BoardDetailsComponent } from './board-details.component';

const boards: Board[] = [
  { id: 1, name: 'Website Redesign', description: '', accent: '#000', members: [], updatedAt: 1 },
];

describe('BoardDetailsComponent', () => {
  let fixture: ComponentFixture<BoardDetailsComponent>;
  let store: MockStore;

  // detectChanges (and therefore ngOnInit) is left to the caller so a test
  // can install a router.navigate spy beforehand and observe the very first
  // emission of the redirect-checking subscription.
  async function createWith(state = { ...initialBoardsState, boards }) {
    await TestBed.configureTestingModule({
      imports: [BoardDetailsComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [boardsFeatureKey]: state } }),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ boardId: '1' })) },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(BoardDetailsComponent);
    return fixture;
  }

  it('should create', async () => {
    await createWith();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('selects the board matching :boardId from the store', async () => {
    await createWith();
    fixture.detectChanges();
    const board = await firstValueFrom(fixture.componentInstance.board$);
    expect(board?.name).toBe('Website Redesign');
  });

  it('exposes the four columns for the tab nav', async () => {
    await createWith();
    fixture.detectChanges();
    expect(fixture.componentInstance.columns.length).toBe(4);
  });

  it('does not redirect to /not-found while still loading', async () => {
    await createWith({ ...initialBoardsState, boards: [], loading: true });
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');
    fixture.detectChanges();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not redirect to /not-found when the API request failed', async () => {
    await createWith({ ...initialBoardsState, boards: [], error: 'Server unreachable' });
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');
    fixture.detectChanges();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('redirects to /not-found once data has loaded and the board truly does not exist', async () => {
    await createWith({ ...initialBoardsState, boards: [], loaded: true });
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledWith(['/not-found']);
  });
});
