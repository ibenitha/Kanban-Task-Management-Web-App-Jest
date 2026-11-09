import seed from '../../../../mock-api/seed.json';
import { InMemoryDataService } from './in-memory-data.service';

// TESTING LAB: the production mock backend's own logic (seed copy + id generation).
describe('InMemoryDataService', () => {
  const service = new InMemoryDataService();

  it('starts with the same boards and tasks as json-server (seed.json)', () => {
    const db = service.createDb();
    expect(db.boards).toHaveLength(seed.boards.length);
    expect(db.tasks).toHaveLength(seed.tasks.length);
  });

  it('returns a copy, so changes never leak back into the seed data', () => {
    const db = service.createDb();
    db.boards[0].name = 'Changed';
    expect(seed.boards[0].name).not.toBe('Changed');
  });

  it.each([
    [[{ id: 1 }, { id: 7 }, { id: 3 }], 8],
    [[], 1],
  ])('generates the next id (max + 1) for %j', (collection, expected) => {
    expect(service.genId(collection)).toBe(expected);
  });
});
