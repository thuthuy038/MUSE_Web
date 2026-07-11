import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-live-chat',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './live-chat.html',
  styleUrl: './live-chat.css'
})
export class LiveChat implements OnInit, AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  chatList: any[] = [];
  filteredChatList: any[] = [];
  selectedChat: any = null;
  currentOrder: any = null;
  searchText: string = '';
  newMessage: string = '';
  isLoading: boolean = false;

  private apiChatUrl = 'http://localhost:3000/api/chats';
  private apiOrderUrl = 'http://localhost:3000/api/orders';
  private apiUserUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.loadChatData();
  }

  loadChatData() {
    this.isLoading = true;
    this.http.get<any[]>(this.apiChatUrl).subscribe({
      next: (data) => {
        this.chatList = data;
        this.filteredChatList = [...this.chatList];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  searchCustomers() {
    const term = this.searchText.trim().toLowerCase();
    if (!term) {
      this.filteredChatList = [...this.chatList];
      return;
    }
    this.filteredChatList = this.chatList.filter(chat =>
      chat.customerName.toLowerCase().includes(term) ||
      chat.customerId.toLowerCase().includes(term)
    );
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => this.executeSend('', reader.result as string);
    }
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChat) return;
    this.executeSend(this.newMessage, null);
    this.newMessage = '';
  }

  private executeSend(content: string, image: string | null) {
    const payload = {
      customerId: this.selectedChat.customerId,
      sender: 'admin',
      content: content,
      image: image,
      customerName: this.selectedChat.customerName
    };

    this.http.post(`${this.apiChatUrl}/send`, payload).subscribe({
      next: (updatedChat: any) => {
        this.selectedChat.messages = [...updatedChat.messages];
        this.selectedChat.lastMessage = content || '[Hình ảnh]';
        const index = this.chatList.findIndex(c => c.customerId === this.selectedChat.customerId);
        if (index !== -1) {
          this.chatList[index] = this.selectedChat;
          this.filteredChatList = [...this.chatList];
        }
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {

        this.toastr.error('Gửi tin nhắn thất bại');
      }
    });
  }

  selectChat(chat: any) {
    this.selectedChat = chat;
    this.loadCurrentOrder(chat.customerId);
    this.loadCustomerAvatar(chat.customerId);
  }

  loadCustomerAvatar(customerId: string) {
    if (!customerId || customerId.startsWith('GUEST')) return;
    this.http.get<any>(`${this.apiUserUrl}/code/${customerId}`).subscribe({
      next: (user) => {
        if (user.avatar) {
          this.selectedChat.avatar = typeof user.avatar === 'object'
            ? `http://localhost:3000${user.avatar.url}`
            : user.avatar;
        }
      },
      error: () => { }
    });
  }

  loadCurrentOrder(customerId: string) {
    if (!customerId || customerId.startsWith('GUEST')) {
      this.currentOrder = null;
      return;
    }
    this.http.get<any[]>(`${this.apiOrderUrl}?customerId=${customerId}`).subscribe({
      next: (orders) => {
        if (orders && orders.length > 0) {
          // Lấy đơn hàng đầu tiên 
          this.currentOrder = orders[0];
        } else {
          this.currentOrder = null;
        }
      },
      error: (err) => {
        this.currentOrder = null;
      }
    });
  }

  updateOrderNote() {
    if (!this.currentOrder || !this.currentOrder._id) return;
    this.http.put(`${this.apiChatUrl}/update-order-note/${this.currentOrder._id}`, {
      note: this.currentOrder.note
    }).subscribe({
      next: () => this.toastr.success('Đã lưu ghi chú!'),
      error: () => this.toastr.error('Lỗi lưu ghi chú')
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }
}