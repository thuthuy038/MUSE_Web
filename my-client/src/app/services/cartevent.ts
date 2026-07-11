import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CartEventsService {
  private refreshCartSubject = new Subject<void>();
  refreshCart$ = this.refreshCartSubject.asObservable();

  emitRefreshCart() {
    this.refreshCartSubject.next();
  }
}