import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { NotificationService } from './core/services/notification/notification.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])], // AppComponent's template uses routerLink
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the persistent sidebar nav', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.sidebar__nav')?.textContent).toContain('Boards');
  });

  it('renders a skip link targeting the main content', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const skipLink = compiled.querySelector('.skip-link') as HTMLAnchorElement;
    expect(skipLink.getAttribute('href')).toBe('#main-content');
    expect(compiled.querySelector('#main-content')).toBeTruthy();
  });

  // TESTING LAB: parent + child working together — the service publishes a
  // notification, AppComponent passes it to <app-toast> via @Input, and the
  // toast's (dismissed) @Output clears it again.
  it('shows a toast when NotificationService publishes, and clears it on dismiss', () => {
    const notifications = TestBed.inject(NotificationService);
    const compiled = fixture.nativeElement as HTMLElement;

    notifications.error('The server is unreachable.');
    fixture.detectChanges();
    expect(compiled.querySelector('app-toast')?.textContent).toContain('The server is unreachable.');

    (compiled.querySelector('.toast__dismiss') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('app-toast')).toBeNull();
  });
});
