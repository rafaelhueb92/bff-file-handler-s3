import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { RequestWithId } from '../interfaces/request-with-id.interface';

@Injectable()
export class ContextService {
  private readonly storage = new AsyncLocalStorage<Map<string, any>>();

  run(request: RequestWithId, callback: () => void) {
    const store = new Map<string, any>();
    this.storage.run(store, callback);
  }

  set<T = any>(key: string, value: T): void {
    const store = this.storage.getStore();
    if (store) store.set(key, value);
  }

  get<T = any>(key: string): T | undefined {
    const store = this.storage.getStore();
    return store?.get(key);
  }
}
