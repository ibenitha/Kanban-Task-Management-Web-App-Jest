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
});
