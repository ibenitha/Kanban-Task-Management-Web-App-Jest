import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth/auth.service';

describe('LoginComponent', () => {
  async function createWith(returnUrl: string | null) {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => sessionStorage.clear());

  it('should create', async () => {
    const fixture = await createWith(null);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('defaults returnUrl to /boards when none is provided', async () => {
    const fixture = await createWith(null);
    expect(fixture.componentInstance.returnUrl).toBe('/boards');
  });

  it('accepts a safe internal returnUrl', async () => {
    const fixture = await createWith('/settings');
    expect(fixture.componentInstance.returnUrl).toBe('/settings');
  });

  it('rejects an absolute/external returnUrl to avoid an open redirect', async () => {
    const fixture = await createWith('https://evil.example.com');
    expect(fixture.componentInstance.returnUrl).toBe('/boards');
  });

  it('rejects a protocol-relative returnUrl ("//host")', async () => {
    const fixture = await createWith('//evil.example.com');
    expect(fixture.componentInstance.returnUrl).toBe('/boards');
  });

  it('logs in and navigates to the resolved returnUrl', async () => {
    const fixture = await createWith('/settings');
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl');

    fixture.componentInstance.login();

    expect(authService.isLoggedIn()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith('/settings');
  });
});
