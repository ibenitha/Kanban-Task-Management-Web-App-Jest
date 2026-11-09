import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { handleHttpError } from './http-error';

// TESTING LAB: the error-handling logic shared by BoardService and TaskService,
// tested on its own with different HTTP status codes.
describe('handleHttpError', () => {
  // Runs the handler and returns the message the resulting Observable errors with.
  async function messageFor(status: number): Promise<string> {
    const handler = handleHttpError('save the task');
    try {
      await firstValueFrom(handler(new HttpErrorResponse({ status })));
    } catch (message) {
      return message as string;
    }
    throw new Error('Expected the Observable to error');
  }

  it.each([
    [0, 'Could not save the task. The server is unreachable — please try again.'],
    [404, 'Could not save the task. It no longer exists on the server.'],
    [500, 'Could not save the task. The server responded with error 500.'],
    [403, 'Could not save the task. The server responded with error 403.'],
  ])('turns status %i into a friendly message', async (status, expected) => {
    expect(await messageFor(status)).toBe(expected);
  });
});
