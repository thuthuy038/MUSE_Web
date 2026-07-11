import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from "@angular/router";
import { PromotionService } from '../../services/promotion';

@Component({
  selector: 'app-promotion-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './promotion-management.html',
  styleUrls: ['./promotion-management.css'],
})
export class PromotionManagement implements OnInit {
  promotions: any[] = []
  displayPromotions: any[] = []
  filteredPromotions: any[] = []

  keyword: string = '';
  selectedStatus: string = '';
  selectedType: string = '';

  sortField: string = ''
  sortDirection: number = 1

  currentPage = 1
  pageSize = 10
  totalPages = 0
  pages: number[] = []

  constructor(private promotionService: PromotionService) { }

  ngOnInit(): void {
    this.loadPromotions()
  }

  loadPromotions() {
    this.promotionService.getPromotions().subscribe(data => {
      this.promotions = data
      this.filteredPromotions = [...data]
      this.updatePagination()
    })
  }

  // Tìm kiếm
  onSearch() {
    this.applyFilter();
  }

  // Lọc theo trạng thái
  filterStatus(status: string) {
    this.selectedStatus = status;
    this.applyFilter();
  }

  // Lọc theo loại
  filterType(type: string) {
    this.selectedType = type;
    this.applyFilter();
  }

  // Áp dụng tất cả bộ lọc
  applyFilter() {
    let temp = [...this.promotions];

    // Tìm kiếm theo từ khóa
    if (this.keyword) {
      const key = this.keyword.toLowerCase();
      temp = temp.filter(p =>
        p.name?.toLowerCase().includes(key) ||
        p.code?.toLowerCase().includes(key)
      );
    }

    // Lọc theo trạng thái
    if (this.selectedStatus) {
      temp = temp.filter(p => p.status === this.selectedStatus);
    }

    // Lọc theo loại
    if (this.selectedType) {
      temp = temp.filter(p => p.promotionType === this.selectedType);
    }

    this.filteredPromotions = temp;
    this.updatePagination();
  }

  resetFilter() {
    this.keyword = '';
    this.selectedStatus = '';
    this.selectedType = '';
    this.filteredPromotions = [...this.promotions];
    this.updatePagination();
  }

  // Sắp xếp
  sort(field: string) {
    if (this.sortField === field) {
      this.sortDirection = -this.sortDirection;
    } else {
      this.sortField = field;
      this.sortDirection = 1;
    }

    this.filteredPromotions.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (field === 'startDate' || field === 'endDate') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      return valA > valB ? this.sortDirection : -this.sortDirection;
    });

    this.changePage(this.currentPage);
  }

  // Phân trang
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredPromotions.length / this.pageSize);
    this.currentPage = 1;
    this.changePage(1);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;

    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.displayPromotions = this.filteredPromotions.slice(start, end);

    this.updateVisiblePages();
  }

  updateVisiblePages() {
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    this.pages = [];
    for (let i = start; i <= end; i++) {
      this.pages.push(i);
    }
  }

  // Format loại khuyến mãi
  formatMethod(method: string) {
    switch (method) {
      case 'discountOrder': return 'Giảm giá đơn hàng';
      case 'giftOrder': return 'Tặng quà';
      case 'buyXGetY': return 'Mua X tặng Y';
      case 'quantityDiscount': return 'Giảm theo SL';
      default: return method;
    }
  }

  // Xóa khuyến mãi
  deletePromotion(id: string) {
    if (confirm('Bạn có chắc muốn xoá khuyến mãi này?')) {
      this.promotionService.deletePromotion(id).subscribe(() => {
        alert('Đã xoá thành công!');
        this.loadPromotions();
      });
    }
  }
}