import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chat-widget.html',
  styleUrls: ['./chat-widget.css'],
})
export class ChatWidget implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  isOpen = false;
  isChatting = false;
  messages: any[] = [];
  userMessage: string = '';
  customerId: string = '';
  customerName: string = '';
  isLoggedIn: boolean = false;
  private pollingInterval: any;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Lắng nghe sự thay đổi đăng nhập
    this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.customerId = user.code || user._id;
        this.customerName = user.name || 'Khách hàng';
        this.isLoggedIn = true;
        localStorage.removeItem('muse_guest_id');
      } else {
        this.setupGuestMode();
      }
      if (this.isOpen) this.loadChatHistory();
    });

    this.pollingInterval = setInterval(() => {
      if (this.isOpen) this.loadChatHistory();
    }, 3000);
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  private setupGuestMode() {
    let guestId = localStorage.getItem('muse_guest_id');
    if (!guestId) {
      guestId = 'GUEST-' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('muse_guest_id', guestId);
    }
    this.customerId = guestId;
    this.customerName = 'Khách vãng lai';
    this.isLoggedIn = false;
  }

  loadChatHistory() {
    if (!this.customerId) return;

    this.http.get<any[]>('http://localhost:3000/api/chats').subscribe({
      next: (allChats) => {
        const myChat = allChats.find(c => c.customerId === this.customerId);
        if (myChat && myChat.messages) {
          if (JSON.stringify(myChat.messages) !== JSON.stringify(this.messages)) {
            this.messages = [...myChat.messages];
            this.cdr.detectChanges();
            this.scrollToBottom();
          }
        } else {
          this.messages = [];
          // Không thay đổi isChatting ở đây
        }
      },
      error: (err) => console.error('Lỗi tải lịch sử chat:', err)
    });
  }

  sendMessage() {
    if (!this.userMessage.trim() || !this.customerId) return;

    const payload = {
      customerId: this.customerId,
      customerName: this.customerName,
      sender: this.isLoggedIn ? 'customer' : 'guest',
      content: this.userMessage
    };

    this.http.post('http://localhost:3000/api/chats/send', payload).subscribe({
      next: () => {
        this.userMessage = '';
        this.loadChatHistory();
      },
      error: (err) => console.error('Lỗi gửi tin nhắn:', err)
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadChatHistory();
    }
  }

  startChat() {
    this.isChatting = true;      // Giữ true ngay cả khi chưa có tin nhắn
    this.loadChatHistory();      // Tải tin nhắn (nếu có)
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom() {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}