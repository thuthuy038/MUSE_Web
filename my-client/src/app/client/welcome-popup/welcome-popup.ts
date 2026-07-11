import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome-popup',
  imports: [CommonModule],
  templateUrl: './welcome-popup.html',
  styleUrl: './welcome-popup.css',
})
export class WelcomePopup implements OnInit {

  isPopupVisible: boolean = false; 

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Hiển thị pop-up sau 1 giây (để tránh làm gián đoạn tải trang ban đầu)
    setTimeout(() => {
      this.isPopupVisible = true;
    }, 1000); 
  }

  closePopup(): void {
    this.isPopupVisible = false;
  }

  /**
   * Chuyển hướng đến trang danh mục sản phẩm khi click vào poster.
   */
  navigateToProducts(): void {
    this.closePopup(); // Đóng pop-up ngay khi chuyển hướng
    this.router.navigate(['/productlist']); 
  }
}
