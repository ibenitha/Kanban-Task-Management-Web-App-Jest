import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { AuthService } from '../../core/services/auth/auth.service';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.clear());

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('logs out and navigates back to /boards', () => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    authService.login();
    const navigateSpy = jest.spyOn(router, 'navigate');

    fixture.componentInstance.logout();

    expect(authService.isLoggedIn()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/boards']);
  });
});
