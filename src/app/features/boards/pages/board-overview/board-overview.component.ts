import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Observable, map, switchMap } from 'rxjs';
import { Column } from '../../../../core/models/column.model';
import { Task } from '../../../../core/models/task.model';
import { KANBAN_COLUMNS } from '../../../../core/constants/kanban-columns';
import * as BoardsActions from '../../state/boards.actions';
import * as BoardsSelectors from '../../state/boards.selectors';
import { DueLabelPipe } from '../../../../shared/pipes/due-label.pipe';

// Default child of a board: /boards/:boardId/overview. :boardId isn't part
// of this route's own path — it's inherited from the parent (see
// withRouterConfig({ paramsInheritanceStrategy: 'always' }) in
// app.config.ts) — so this component reads it off the same paramMap as if
// it were its own.
@Component({
  selector: 'app-board-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, DueLabelPipe], // TESTING LAB: dueLabel pipe
  templateUrl: './board-overview.component.html',
  styleUrl: './board-overview.component.css',
})
export class BoardOverviewComponent implements OnInit {
  boardId!: number;
  columns: Column[] = KANBAN_COLUMNS;
  tasksByColumn$!: Observable<Record<string, Task[]>>;

  private destroyRef = inject(DestroyRef);

  constructor(
    private store: Store,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.store.dispatch(BoardsActions.loadBoardData());

    // Eager subscription: the "+ Add task" link above the async-gated
    // kanban block also needs boardId, so it can't rely solely on the
    // template's own async pipe (which wouldn't run until *that* part of
    // the template is reached) to set it.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.boardId = Number(params.get('boardId'));
    });

    this.tasksByColumn$ = this.route.paramMap.pipe(
      map((params) => Number(params.get('boardId'))),
      switchMap((boardId) => this.store.select(BoardsSelectors.selectTasksForBoard(boardId))),
      map((tasks) => this.groupByColumn(tasks)),
    );
  }

  private groupByColumn(tasks: Task[]): Record<string, Task[]> {
    return Object.fromEntries(
      this.columns.map((column) => [column.id, tasks.filter((task) => task.status === column.id)]),
    );
  }
}
