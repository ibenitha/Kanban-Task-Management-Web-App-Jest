import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppNotification } from '../../../core/services/notification/notification.service';

// TESTING LAB: the toast markup was moved out of AppComponent into this small,
// presentational component. It has no injected services: data comes in through
// @Input and the dismiss click goes out through @Output, so it's easy to test.
@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  @Input({ required: true }) notification!: AppNotification;

  // Tells the parent the user clicked ×. The parent decides what "dismiss" means.
  @Output() dismissed = new EventEmitter<void>();

  dismiss(): void {
    this.dismissed.emit();
  }
}
