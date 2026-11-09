import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { EMPTY, Observable, shareReplay, switchMap } from 'rxjs';
import { Column } from '../../../../core/models/column.model';
import { Task } from '../../../../core/models/task.model';
import { findColumn } from '../../../../core/constants/kanban-columns';
import * as BoardsActions from '../../state/boards.actions';
import * as BoardsSelectors from '../../state/boards.selectors';
import { DueLabelPipe } from '../../../../shared/pipes/due-label.pipe';

// /boards/:boardId/columns/:columnId — a focused, single-column view.
// :boardId is inherited from the parent route; :columnId is this route's
// own parameter. Both come off the same paramMap.
@Component({
  selector: 'app-column-details',
  standalone: true,
  imports: [CommonModule, RouterLink, DueLabelPipe], // TESTING LAB: dueLabel pipe
  templateUrl: './column-details.component.html',
  styleUrl: './column-details.component.css',
})
export class ColumnDetailsComponent implements OnInit {
  boardId!: number;
  column?: Column;
  tasks$!: Observable<Task[]>;

  private destroyRef = inject(DestroyRef);

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.store.dispatch(BoardsActions.loadBoardData());

    this.tasks$ = this.route.paramMap.pipe(
      switchMap((params) => {
        this.boardId = Number(params.get('boardId'));
        this.column = findColumn(params.get('columnId') ?? '');

        if (!this.column) {
          // :columnId is free-form text in the URL — "todo" is valid,
          // "made-up-column" is not. An unknown id is handled here rather
          // than rendering a blank or broken column view.
          this.router.navigate(['/not-found']);
          return EMPTY;
        }

        return this.store.select(BoardsSelectors.selectTasksForBoard(this.boardId, this.column.id));
      }),
      // Shared so the eager subscribe below (which is what actually runs
      // the column-id validation, even before the template renders
      // anything) and the template's own async pipe read the same
      // execution instead of validating/selecting twice.
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    // *ngIf="column" gates the async pipe in the template — so without this
    // eager subscription, an invalid :columnId would never trigger the
    // redirect above, since the block containing tasks$ | async would never
    // render in the first place.
    this.tasks$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
