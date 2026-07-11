import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../services/product';
import { CategoryService } from '../../services/category';
import { SearchService } from '../../services/search';
import { Product } from '../product/product';
import { Filter } from '../filter/filter';
import { Pagination } from '../pagination/pagination';
import { IProduct, IVariant } from '../../interfaces/product';
import { ICategory } from '../../interfaces/category';

interface ProductFilters {
  categories: string[];    // chứa key danh mục (vd: 'dam', 'ao') hoặc ['Tất cả'] / []
  minPrice: number | null;
  maxPrice: number | null;
  size: string | null;
  rating: number | null;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, Product, Filter, Pagination, RouterLink],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.css'],
})
export class ProductList implements OnInit {
  @ViewChild('productGrid') productGrid!: ElementRef<HTMLElement>;

  products: IProduct[] = [];
  filteredProducts: IProduct[] = [];
  pagedProducts: IProduct[] = [];

  // Breadcrumb hiển thị tên danh mục
  currentCategoryParam: string = 'Tất cả Sản phẩm';

  // Phân trang
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 0;

  // Map key -> tên hiển thị
  categoryNameMap: { [key: string]: string } = {};

  // Bộ lọc hiện tại
currentFilters: ProductFilters = {
  categories: ['Tất cả'],
  minPrice: null,
  maxPrice: null,
  size: null,
  rating: null
};

  // Trạng thái sắp xếp
  currentSort: 'none' | 'newest' | 'bestseller' | 'price' = 'none';
  priceSortAsc = true;

  // Tạm từ URL
  pendingCategory: string | null = null;
  pendingSearch: string | null = null;

  // Cờ load
  productsLoaded = false;
  categoriesLoaded = false;

  isFilterOpen = false;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private searchService: SearchService
  ) { }

  ngOnInit(): void {
    // Lắng nghe query params ngay lập tức (không chờ danh mục) để lưu trạng thái mong muốn
    this.route.queryParams.subscribe(params => {
      this.pendingSearch = params['search'] || null;
      this.pendingCategory = params['category'] || null;

      // Chỉ cập nhật breadcrumb tạm thời, áp dụng thực tế sau khi dữ liệu sẵn
      if (this.pendingSearch) {
        this.currentCategoryParam = `Kết quả tìm kiếm: "${this.pendingSearch}"`;
      } else if (!this.pendingCategory || this.pendingCategory === 'all') {
        this.currentCategoryParam = this.categoryNameMap['all'] || 'Tất cả Sản phẩm';
        this.pendingCategory = null;
      } else {
        this.currentCategoryParam = this.categoryNameMap[this.pendingCategory] || 'Nhiều danh mục';
      }

      if (this.productsLoaded && this.categoriesLoaded) {
        this.applyPendingFilters();
      }
    });

    // Nạp danh mục trước rồi sản phẩm
    this.categoryService.getCategories().subscribe({
      next: (cats: ICategory[]) => {
        cats.forEach(c => this.categoryNameMap[c._id] = c.name);
        this.categoryNameMap['all'] = 'Tất cả Sản phẩm';
        this.categoriesLoaded = true;
        this.loadProducts();
        // Sau khi có danh mục, subscribe search service cho live search
        this.searchService.searchTerm$.subscribe(term => {
          if (!this.productsLoaded) return;
          if (term) {
            this.applySearch(term);
          } else if (!this.pendingSearch) {
            this.onResetFilters();
          }
        });
      },
      error: err => console.error('Lỗi tải danh mục:', err)
    });
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data.filter(p => p.status === 'active' || p.status === 'featured');
        this.filteredProducts = [...this.products];
        this.productsLoaded = true;

        if (this.categoriesLoaded) {
          this.applyPendingFilters();
        }
        this.updatePagination();
      },
      error: err => console.error('Lỗi tải sản phẩm:', err)
    });
  }

  /** Áp dụng bộ lọc pending từ URL */
  applyPendingFilters(): void {
    if (this.pendingSearch) {
      this.applySearch(this.pendingSearch);
      return;
    }

    if (this.pendingCategory) {
      // Lọc theo một danh mục cụ thể (key)
      this.currentFilters = {
        ...this.currentFilters,
        categories: [this.pendingCategory]
      };
      this.applyFilters(this.currentFilters);
    } else {
      // Không có category => hiển thị tất cả
      this.onResetFilters();
    }
  }

  /** Tìm kiếm theo tên */
  applySearch(keyword: string): void {
    const normKeyword = this.normalize(keyword);
    const searchTokens = this.tokenize(normKeyword);

    // Thử map chính xác sang tên danh mục (so khớp toàn bộ sau normalize)
    const matchedCategoryKey = Object.keys(this.categoryNameMap)
      .find(key => this.normalize(this.categoryNameMap[key]) === normKeyword);

    if (matchedCategoryKey && matchedCategoryKey !== 'all') {
      this.currentFilters = { ...this.currentFilters, categories: [matchedCategoryKey] };
      this.applyFilters(this.currentFilters);
      this.currentCategoryParam = this.categoryNameMap[matchedCategoryKey];
      if (this.filteredProducts.length === 0) {
        this.currentCategoryParam = `Không tìm thấy sản phẩm trong danh mục "${this.categoryNameMap[matchedCategoryKey]}"`;
      }
      return;
    }

    // Tìm kiếm theo token đầy đủ (tránh 'ao' ăn vào 'ngao')
    this.filteredProducts = this.products.filter(p => {
      const combined = `${p.name} ${p.description ?? ''}`;
      const normCombinedTokens = new Set(this.tokenize(this.normalize(combined)));
      return searchTokens.every(t => normCombinedTokens.has(t));
    });

    this.currentCategoryParam = `Kết quả tìm kiếm: "${keyword}"`;
    this.currentPage = 1;
    this.updatePagination();

    if (this.filteredProducts.length === 0) {
      this.currentCategoryParam = `Không tìm thấy kết quả cho "${keyword}"`;
    }
  }

  /** Áp dụng phân trang */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);

    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.itemsPerPage);

    // Force Angular cập nhật view
    this.cdr.detectChanges();
  }

  /** Chuyển trang */
  onPageChange(newPage: number): void {
    if (newPage > 0 && newPage <= this.totalPages && newPage !== this.currentPage) {
      this.currentPage = newPage;
      this.updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Toggle filter (mobile) */
  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;
  }

  /** Nhận filters từ Filter component */
  onApplyFilters(filters: any): void {
    this.currentFilters = filters;
    this.currentPage = 1;
    this.applyFilters(filters);

    // Cập nhật Breadcrumb dựa trên ID danh mục
    if (filters.categories.length === 0 || filters.categories.includes('all')) {
      this.currentCategoryParam = 'Tất cả Sản phẩm';
    } else {
      const firstId = filters.categories[0];
      this.currentCategoryParam = this.categoryNameMap[firstId] || 'Danh mục đã chọn';
    }

    if (this.isFilterOpen) this.isFilterOpen = false;
  }

  /** Reset filter hoàn toàn */
  onResetFilters(): void {
    this.currentFilters = {
      categories: ['Tất cả'],
      minPrice: null,
      maxPrice: null,
      size: null,
      rating: null
    };
    this.currentCategoryParam = this.categoryNameMap['all'] || 'Tất cả Sản phẩm';
    this.filteredProducts = [...this.products];
    this.currentPage = 1;
    this.currentSort = 'none';
    this.priceSortAsc = true;
    this.updatePagination();
  }

  /** Sắp xếp: mới nhất */
  sortByNewest(): void {
    this.currentSort = 'newest';
    this.filteredProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    this.updatePagination();
  }

  /** Sắp xếp: bán chạy */
  sortByBestSeller(): void {
    this.currentSort = 'bestseller';
    this.filteredProducts.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    this.updatePagination();
  }

  /** Sắp xếp: giá */
  sortByPrice(): void {
    this.currentSort = 'price';
    this.priceSortAsc = !this.priceSortAsc;
    this.filteredProducts.sort((a, b) => {
      const priceA = a.discountPrice ?? a.price;
      const priceB = b.discountPrice ?? b.price;
      return this.priceSortAsc ? priceA - priceB : priceB - priceA;
    });
    this.updatePagination();
  }

  /** Lọc chính */
  applyFilters(filters: ProductFilters): void {
    let temp = [...this.products];

    // 1. Danh mục (mảng rỗng hoặc chứa 'Tất cả' => không lọc)
    if (filters.categories &&
      filters.categories.length > 0 &&
      !filters.categories.includes('all')) {
      temp = temp.filter(p => filters.categories.includes(p.category));
    }

    // 2. Giá
    if (filters.minPrice != null) {
      temp = temp.filter(p => (p.discountPrice ?? p.price) >= filters.minPrice!);
    }
    if (filters.maxPrice != null) {
      temp = temp.filter(p => (p.discountPrice ?? p.price) <= filters.maxPrice!);
    }

    // 3. Kích cỡ
    if (filters.size) {
  temp = temp.filter(p =>
    p.variants?.some((v: IVariant) => v.size === filters.size)
  );
}

// 4. Rating
if (filters.rating != null) {
  temp = temp.filter(p => (p.rating || 0) >= filters.rating!);
}

    this.filteredProducts = temp;

    // Áp dụng sắp xếp hiện tại
    if (this.currentSort === 'newest') this.sortByNewest();
    else if (this.currentSort === 'bestseller') this.sortByBestSeller();
    else if (this.currentSort === 'price') this.sortByPrice();
    else this.updatePagination();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private normalize(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private tokenize(normStr: string): string[] {
    return normStr
      .split(/[^a-z0-9]+/)
      .filter(t => t.length > 0);
  }
}