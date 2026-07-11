import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = 'https://server-testing-ymn9.onrender.com/api/chats';

  constructor(private http: HttpClient) {}

  sendMessageToDb(payload: any) {
    // Payload lúc này đã chứa customerName thật lấy từ localStorage
    return this.http.post(`${this.apiUrl}/send`, payload);
  }
}