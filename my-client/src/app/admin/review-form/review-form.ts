import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './review-form.html',
  styleUrl: './review-form.css'
})
export class ReviewFormComponent implements OnInit {
  comment: any;
  replyContent = '';
  isReplied = false;
  isEditing = false;
  commentId = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.commentId = params.get('id') || '';
      if (this.commentId) {
        this.loadComment();
      }
    });
  }

  loadComment() {
    this.http.get<any>(`https://server-testing-ymn9.onrender.com/api/reviews/${this.commentId}`)
      .subscribe({
        next: (data) => {
          this.comment = data;
          // Giả sử backend trả về trường status là 'replied'
          this.isReplied = this.comment.status === 'replied';
          if (this.isReplied) {
            this.replyContent = this.comment.adminReply || '';
          }
        },
        error: (err) => console.error("Lỗi khi tải đánh giá:", err)
      });
  }

  viewOrderDetail(orderDbId: string) {
    if (!orderDbId) {
      alert("Không tìm thấy ID đơn hàng!");
      return;
    }
    this.router.navigate(['/admin/order-edit', orderDbId]);
  }

  submitReply() {
    if (!this.replyContent.trim()) return;

    this.http.put(`https://server-testing-ymn9.onrender.com/api/reviews/${this.commentId}/reply`, {
      adminReply: this.replyContent
    }).subscribe({
      next: () => {
        alert(this.isEditing ? "Đã cập nhật phản hồi!" : "Đã gửi phản hồi thành công!");
        this.isReplied = true;
        this.isEditing = false;
        this.loadComment(); // Load lại để cập nhật trạng thái mới nhất
      },
      error: () => alert("Lỗi khi lưu phản hồi")
    });
  }

  enableEdit() {
    this.isEditing = true;
  }

  goBack() {
    this.router.navigate(['/admin/review-management']);
  }
}