import { Component, OnInit } from '@angular/core';
import { ICategory } from '../../interfaces/category';
import { CategoryService } from '../../services/category';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-category-management',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './category-management.html',
  styleUrl: './category-management.css',
})
export class CategoryManagement implements OnInit {

  categories: ICategory[] = [];
  filteredCategories: ICategory[] = [];
  paginatedCategories: ICategory[] = [];

  searchText: string = '';
  selectedType: string = 'all';
  selectedStatus: string = 'all';

  // pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  pages: number[] = [];

  constructor(private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  // Load dữ liệu từ API
  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.filteredCategories = [...data];

        this.updatePagination();
      },
      error: (err) => {
        console.error('Lỗi load categories:', err);
      }
    });
  }

  // Filter
  applyFilter() {

    this.filteredCategories = this.categories.filter(cat => {

      const matchSearch =
        cat.name.toLowerCase().includes(this.searchText.toLowerCase());

      const matchType =
        this.selectedType === 'all' || cat.type === this.selectedType;

      const matchStatus =
        this.selectedStatus === 'all' || cat.status === this.selectedStatus;

      return matchSearch && matchType && matchStatus;

    });

    this.updatePagination();

  }

  // Convert status hiển thị UI
  getStatusText(status: string) {

    switch (status) {
      case 'active':
        return 'Đang hiển thị trên trang web';

      case 'featured':
        return 'Hiển thị nổi bật';

      case 'inactive':
        return 'Bị vô hiệu hóa';

      default:
        return status;
    }

  }

  deleteCategory(id: string) {

    if (!confirm("Bạn có chắc muốn xóa danh mục này?")) {
      return
    }

    this.categoryService
      .deleteCategory(id)
      .subscribe(() => {

        alert("Xóa danh mục thành công")

        this.loadCategories() 

      })

  }

  changePage(page: number) {

    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;

    const start = (page - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    this.paginatedCategories =
      this.filteredCategories.slice(start, end);

    this.updateVisiblePages();

  }

  updatePagination() {

    this.totalPages =
      Math.ceil(this.filteredCategories.length / this.itemsPerPage);

    this.currentPage = 1;

    this.changePage(1);

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

}
