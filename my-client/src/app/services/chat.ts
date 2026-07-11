import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = 'http://localhost:3000/api/chats';

  constructor(private http: HttpClient) {}

  sendMessageToDb(payload: any) {
    // Payload lúc này đã chứa customerName thật lấy từ localStorage
    return this.http.post(`${this.apiUrl}/send`, payload);
  }
}