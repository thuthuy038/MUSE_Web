import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, Output, OutputEmitterRef, SimpleChanges, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrls: ['./pagination.css'],
  encapsulation: ViewEncapsulation.None,
})
export class Pagination implements OnInit, OnChanges {
  @Input() totalItems: number = 0;
  @Input() itemsPerPage: number = 12;
  @Input() currentPage: number = 1;

  @Output() pageChange = new OutputEmitterRef<number>();
  // Biến nội bộ
  totalPages: number = 0;
  pages: number[] = []; // Mảng chứa số trang để lặp qua (vd: [1, 2, 3, 4, 5])
  maxPagesToShow: number = 3; // Số lượng nút trang tối đa hiển thị (vd: 1, 2, 3, 4, 5)

  ngOnInit(): void {
    this.calculatePages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalItems'] || changes['itemsPerPage'] || changes['currentPage']) {
      this.calculatePages();
    }
  }

  /**
   * Tính toán tổng số trang và danh sách các nút trang cần hiển thị.
   */
  calculatePages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    // Nếu không có trang nào hoặc chỉ có 1 trang thì không hiển thị gì
    if (this.totalPages <= 1) {
      this.pages = [];
      return;
    }

    // === Logic hiển thị 5 nút trang xung quanh trang hiện tại (tùy chọn) ===
    let startPage: number;
    let endPage: number;

    if (this.totalPages <= this.maxPagesToShow) {
      // Tổng số trang ít hơn giới hạn, hiển thị tất cả
      startPage = 1;
      endPage = this.totalPages;
    } else {
      // Tổng số trang nhiều hơn giới hạn, tính toán nút hiển thị
      const maxPagesBeforeCurrentPage = Math.floor(this.maxPagesToShow / 2);
      const maxPagesAfterCurrentPage = Math.ceil(this.maxPagesToShow / 2) - 1;

      if (this.currentPage <= maxPagesBeforeCurrentPage) {
        // Gần đầu, hiển thị từ 1 đến maxPagesToShow
        startPage = 1;
        endPage = this.maxPagesToShow;
      } else if (this.currentPage + maxPagesAfterCurrentPage >= this.totalPages) {
        // Gần cuối, hiển thị maxPagesToShow trang cuối
        startPage = this.totalPages - this.maxPagesToShow + 1;
        endPage = this.totalPages;
      } else {
        // Ở giữa, hiển thị xung quanh trang hiện tại
        startPage = this.currentPage - maxPagesBeforeCurrentPage;
        endPage = this.currentPage + maxPagesAfterCurrentPage;
      }
    }

    // Tạo mảng số trang để lặp qua trong HTML
    this.pages = Array.from(Array((endPage + 1) - startPage).keys()).map(i => startPage + i);
  }

  /**
   * Xử lý click vào nút trang
   */
  goToPage(page: number): void {
    if (page !== this.currentPage && page > 0 && page <= this.totalPages) {
      this.pageChange.emit(page); // Gửi sự kiện lên component cha
    }
  }

}
