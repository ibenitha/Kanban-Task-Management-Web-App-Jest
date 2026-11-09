import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavigationService } from './core/services/navigation/navigation.service';
import { NotificationService } from './core/services/notification/notification.service';
import { ToastComponent } from './shared/components/toast/toast.component';

// Root layout: a sidebar that stays mounted across every navigation (it
// lives outside <router-outlet>), plus the outlet itself where the Router
// renders whichever page matches the current URL.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  protected navigation = inject(NavigationService);
  // The one shared location that displays whatever NotificationService's
  // BehaviorSubject last published — see notification.service.ts.
  protected notifications = inject(NotificationService);
}
