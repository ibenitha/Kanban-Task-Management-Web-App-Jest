import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpClientInMemoryWebApiModule } from 'angular-in-memory-web-api';
import { appConfig } from './app.config';
import { AuthService } from './core/services/auth/auth.service';
import { InMemoryDataService } from './core/api/in-memory-data.service';

// The HTTP requests are answered asynchronously by the in-memory web API
// (registered below) after a short timer, so wait real time, then force a
// change detection before checking the page.
async function waitForBoardData(harness: RouterTestingHarness): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  harness.fixture.detectChanges();
}

// End-to-end routing behavior, exercised against the REAL route
// configuration (app.config.ts + app.routes.ts + the lazily-loaded
// BoardsModule) rather than a trimmed-down test route table — this is what
// actually proves redirects, guards and lazy loading behave the way the
// app's own routes say they should.
describe('Application routing', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let authService: AuthService;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        // HTTP LAB: always use the in-memory API here, so these end-to-end
        // tests send real HttpClient requests without needing json-server.
        // Tests build with environment.development.ts, whose URLs look like
        // http://localhost:3000/boards (no "api/" segment) — apiBase: ''
        // tells the in-memory API that "boards" is the collection name.
        importProvidersFrom(
          HttpClientInMemoryWebApiModule.forRoot(InMemoryDataService, {
            apiBase: '',
            delay: 0,
            post204: false,
            put204: false,
          }),
        ),
      ],
    });
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('1. redirects / to /boards', async () => {
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/boards');
    // BoardListComponent mounts here and kicks off its own loadBoardData
    // effect — wait for it so it doesn't resolve mid-flight during a later
    // test that expects a clean slate.
    await waitForBoardData(harness);
  });

  it('2. renders the board list at /boards', async () => {
    await harness.navigateByUrl('/boards');
    // The list only appears once GET /boards and GET /tasks have resolved.
    await waitForBoardData(harness);
    expect(harness.routeNativeElement?.textContent).toContain('Boards');
    expect(harness.routeNativeElement?.querySelectorAll('.board-card').length).toBeGreaterThan(0);
  });

  it('3. displays the correct board for a valid :boardId (once authenticated)', async () => {
    authService.login();
    await harness.navigateByUrl('/boards/1/overview');
    await waitForBoardData(harness);
    expect(harness.routeNativeElement?.textContent).toContain('Website Redesign');
  });

  it('4. updates displayed content when :boardId changes (the reuse trap)', async () => {
    authService.login();
    await harness.navigateByUrl('/boards/1/overview');
    await waitForBoardData(harness);
    expect(harness.routeNativeElement?.textContent).toContain('Website Redesign');

    await harness.navigateByUrl('/boards/2/overview');
    await waitForBoardData(harness);
    expect(harness.routeNativeElement?.textContent).toContain('Mobile App');
    expect(harness.routeNativeElement?.textContent).not.toContain('Website Redesign');
  });

  it('5. reacts to query params filtering the board list', async () => {
    await harness.navigateByUrl('/boards?search=mobile');
    await waitForBoardData(harness);
    const cardTitles = Array.from(
      harness.routeNativeElement?.querySelectorAll('.board-card h2') ?? [],
    ).map((el) => el.textContent);
    expect(cardTitles).toEqual(['Mobile App']);
  });

  it('6. renders the overview child route inside BoardDetailsComponent', async () => {
    authService.login();
    await harness.navigateByUrl('/boards/1/overview');
    await waitForBoardData(harness);
    // The board layout (tabs) and the nested overview content are both present.
    expect(harness.routeNativeElement?.querySelector('.board-tabs')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('.kanban')).toBeTruthy();
  });

  it('7. renders the correct task on the nested task route', async () => {
    authService.login();
    await harness.navigateByUrl('/boards/1/tasks/1');
    await waitForBoardData(harness);
    const titleInput = harness.routeNativeElement?.querySelector<HTMLInputElement>('#task-title');
    expect(titleInput?.value).toBe('Design homepage hero');
  });

  it('8. authGuard permits navigation once logged in', async () => {
    authService.login();
    await harness.navigateByUrl('/settings');
    expect(router.url).toBe('/settings');
    expect(harness.routeNativeElement?.textContent).toContain('Settings');
  });

  it('9. authGuard redirects an unauthenticated visit to /login with returnUrl', async () => {
    await harness.navigateByUrl('/settings');
    expect(router.url).toBe('/login?returnUrl=%2Fsettings');
  });

  it('10. logging in returns the user to the original safe returnUrl', async () => {
    await harness.navigateByUrl('/settings');
    expect(router.url).toBe('/login?returnUrl=%2Fsettings');

    const loginButton = harness.routeNativeElement?.querySelector<HTMLButtonElement>('button');
    loginButton?.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/settings');
  });

  it('11. CanDeactivate allows navigation when the task form is unchanged', async () => {
    authService.login();
    await harness.navigateByUrl('/boards/1/tasks/1');
    await waitForBoardData(harness); // let the task actually load before checking the guard

    const confirmSpy = jest.spyOn(window, 'confirm');
    await harness.navigateByUrl('/boards/1/overview');

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(router.url).toBe('/boards/1/overview');
  });

  it('12. CanDeactivate blocks navigation until the user confirms discarding changes', async () => {
    authService.login();
    await harness.navigateByUrl('/boards/1/tasks/1');
    await waitForBoardData(harness); // the title input doesn't exist until the task has loaded
    const titleInput = harness.routeNativeElement!.querySelector<HTMLInputElement>('#task-title')!;
    titleInput.value = 'Edited title';
    titleInput.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    // Cancel the confirm dialog: navigation must be blocked, still on the task.
    jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await harness.navigateByUrl('/boards/1/overview');
    expect(router.url).toBe('/boards/1/tasks/1');

    // Accept the confirm dialog: navigation now proceeds.
    jest.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await harness.navigateByUrl('/boards/1/overview');
    expect(router.url).toBe('/boards/1/overview');
  });

  it('13. renders the registered /not-found route', async () => {
    await harness.navigateByUrl('/not-found');
    expect(harness.routeNativeElement?.textContent).toContain("couldn't find that page");
  });

  it('14. sends an undefined URL to /not-found via the wildcard route', async () => {
    await harness.navigateByUrl('/this/route/does/not/exist');
    expect(router.url).toBe('/not-found');
  });

  it('15. handles an invalid board id and an invalid task id intentionally, not by accident', async () => {
    authService.login();

    // BoardDetailsComponent's redirect-to-/not-found only fires once the
    // HTTP load has resolved and the board/task still isn't found —
    // give it real time to do that before asserting on the final URL.
    await harness.navigateByUrl('/boards/999/overview');
    await waitForBoardData(harness);
    expect(router.url).toBe('/not-found');

    await harness.navigateByUrl('/boards/1/tasks/999');
    await waitForBoardData(harness);
    expect(router.url).toBe('/not-found');
  });
});
