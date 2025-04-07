import { ContextService } from './context.service';
import { RequestWithId } from '../interfaces/request-with-id.interface';

describe('ContextService', () => {
  let service: ContextService;

  beforeEach(() => {
    service = new ContextService();
  });

  it('should set and get values within the same context', (done) => {
    const mockRequest = { id: 'req-123' } as RequestWithId;

    service.run(mockRequest, () => {
      service.set('userId', 42);

      const userId = service.get('userId');
      expect(userId).toBe(42);
      done();
    });
  });

  it('should return undefined if key is not set', (done) => {
    const mockRequest = { id: 'req-456' } as RequestWithId;

    service.run(mockRequest, () => {
      const value = service.get('nonexistent');
      expect(value).toBeUndefined();
      done();
    });
  });

  it('should not share context between runs', (done) => {
    const mockRequest1 = { id: 'req-1' } as RequestWithId;
    const mockRequest2 = { id: 'req-2' } as RequestWithId;

    service.run(mockRequest1, () => {
      service.set('key', 'value1');

      service.run(mockRequest2, () => {
        expect(service.get('key')).toBeUndefined();
        done();
      });
    });
  });
});
