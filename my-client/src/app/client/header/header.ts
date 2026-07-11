import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user';
import { CategoryService } from '../../services/category';
import { SearchService } from '../../services/search';
import { ICategory } from '../../interfaces/category';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  isMenuOpen = false;

  categories: ICategory[] = [];

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  // Tìm kiếm

  showSearchBar = false;
  searchText: string = '';

  constructor(private router: Router, 
    private userService: UserService,
    private categoryService: CategoryService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    // NẠP DANH MỤC KHI COMPONENT KHỞI TẠO
    this.categoryService.getCategories().subscribe(data => {
      this.categories = data;
    });
  }

  isLoggedIn(): boolean {
    return this.userService.isLoggedIn();
  }

  onAccountClick(event?: Event) {
    event?.preventDefault();
    if (this.userService.isLoggedIn()) {
      this.router.navigate(['/account']);
    } else {
      this.router.navigate(['/login']);
    }
  }
  
  toggleSearch() {
    this.showSearchBar = !this.showSearchBar;
  }

  performSearch() {
    if (!this.searchText.trim()) return;

    // Điều hướng chỉ với tham số search (không merge để tránh giữ filter cũ làm sai lệch)
    this.router.navigate(['/productlist'], {
      queryParams: { search: this.searchText.trim() }
    });

    // Cập nhật search term cho live search nếu đang ở trang danh sách
    this.searchService.setSearchTerm(this.searchText.trim());

    this.showSearchBar = false;
  }
  onSearchInput() {
    const term = this.searchText.trim();
    if (this.router.url.startsWith('/productlist')) {
      this.searchService.setSearchTerm(term);
    }
  }
  navigateToCategory(category: string): void {
    this.router.navigate(['/productlist'], { 
      queryParams: { category: category },
      queryParamsHandling: 'merge'
    });
  }
}