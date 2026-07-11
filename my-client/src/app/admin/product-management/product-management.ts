import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../services/product';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-product-management',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-management.html',
  styleUrl: './product-management.css',
})
export class ProductManagement implements OnInit {

  products: any[] = [];
  displayProducts: any[] = [];

  keyword: string = '';
  filteredProducts: any[] = [];

  categories: any[] = [];
  categoryMap: any = {};

  sortField: string = '';
  sortDirection: number = 1; // 1: tăng, -1: giảm

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = []

  selectedProductIds: Set<string> = new Set();
  bulkAction: string = '';

  importLoading = false;

  constructor(private productService: ProductService, private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts() {
    this.productService.getProducts().subscribe(data => {
      this.products = data;
      this.filteredProducts = [...data];
      this.updatePagination();
    });

  }

  loadCategories() {
    this.categoryService.getCategories().subscribe(data => {
      this.categories = data;
      this.categories.forEach(c => {
        this.categoryMap[c._id] = c.name;
      });
    });
  }

  isAllSelected(): boolean {
    return this.displayProducts.length > 0 &&
      this.displayProducts.every(product => this.selectedProductIds.has(product._id));
  }

  filterStatus(status: string) {
    this.filteredProducts = this.products.filter(p => p.status === status);
    this.updatePagination();
  }

  // Chọn tất cả sản phẩm trên trang hiện tại
  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.displayProducts.forEach(product => this.selectedProductIds.add(product._id));
    } else {
      this.displayProducts.forEach(product => this.selectedProductIds.delete(product._id));
    }
  }

  // Chọn/bỏ chọn một sản phẩm
  toggleSelect(productId: string, event: any) {
    if (event.target.checked) {
      this.selectedProductIds.add(productId);
    } else {
      this.selectedProductIds.delete(productId);
    }
  }

  // Kiểm tra có sản phẩm nào được chọn không
  hasSelected(): boolean {
    return this.selectedProductIds.size > 0;
  }

  // Lấy số lượng sản phẩm được chọn
  getSelectedCount(): number {
    return this.selectedProductIds.size;
  }

  // Xuất danh sách sản phẩm ra Excel
  exportToExcel() {
    const selectedProducts = this.products.filter(p => this.selectedProductIds.has(p._id));
    const dataToExport = selectedProducts.length > 0 ? selectedProducts : this.products;

    const exportData = dataToExport.map(product => ({
      'Mã sản phẩm': product.code,
      'Tên sản phẩm': product.name,
      'Danh mục': this.categoryMap[product.category] || product.category,
      'Giá gốc': product.price,
      'Giảm giá': product.discountPercent + '%',
      'Giá bán': product.price * (1 - (product.discountPercent || 0) / 100),
      'Số lượng bán': product.sold || 0,
      'Tồn kho': product.stock,
      'Trạng thái': this.getStatusText(product.status),
      'Ngày tạo': new Date(product.createdAt).toLocaleDateString('vi-VN')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SanPham');
    XLSX.writeFile(wb, `Muse_SanPham_${new Date().toISOString().split('T')[0]}.xlsx`);

    alert(`Đã xuất ${exportData.length} sản phẩm thành công!`);
  }

  // Xóa hàng loạt
  async deleteBulk() {
    if (this.selectedProductIds.size === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${this.selectedProductIds.size} sản phẩm?`)) {
      const ids = Array.from(this.selectedProductIds);
      let successCount = 0;

      for (const id of ids) {
        try {
          await this.productService.deleteProduct(id).toPromise();
          successCount++;
        } catch (err) {
          console.error(`Xóa sản phẩm ${id} thất bại:`, err);
        }
      }

      alert(`Đã xóa thành công ${successCount}/${ids.length} sản phẩm`);
      this.selectedProductIds.clear();
      this.loadProducts();
    }
  }

  // Cập nhật trạng thái hàng loạt
  private updateBulkStatus(status: 'active' | 'featured' | 'disabled') {
    const ids = Array.from(this.selectedProductIds);
    let successCount = 0;
    let completed = 0;

    ids.forEach(id => {
      this.productService.updateProduct(id, { status }).subscribe({
        next: () => {
          successCount++;
          completed++;
          if (completed === ids.length) {
            alert(`Đã cập nhật trạng thái thành công ${successCount}/${ids.length} sản phẩm`);
            this.selectedProductIds.clear();
            this.loadProducts();
          }
        },
        error: (err) => {
          completed++;
          console.error(`Cập nhật sản phẩm ${id} thất bại:`, err);
          if (completed === ids.length) {
            alert(`Đã cập nhật trạng thái thành công ${successCount}/${ids.length} sản phẩm`);
            this.selectedProductIds.clear();
            this.loadProducts();
          }
        }
      });
    });
  }

  // Hiển thị sản phẩm
  activateBulk() {
    if (this.selectedProductIds.size === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn hiển thị ${this.selectedProductIds.size} sản phẩm?`)) {
      this.updateBulkStatus('active');
    }
  }

  // Ẩn sản phẩm
  hideBulk() {
    if (this.selectedProductIds.size === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn ẩn ${this.selectedProductIds.size} sản phẩm?`)) {
      this.updateBulkStatus('disabled');
    }
  }

  // Đánh dấu nổi bật
  featureBulk() {
    if (this.selectedProductIds.size === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn đánh dấu nổi bật ${this.selectedProductIds.size} sản phẩm?`)) {
      this.updateBulkStatus('featured');
    }
  }

  // Thực thi hành động đã chọn
  executeBulkAction() {
    if (!this.bulkAction) {
      alert('Vui lòng chọn hành động');
      return;
    }

    if (this.selectedProductIds.size === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    switch (this.bulkAction) {
      case 'export':
        this.exportToExcel();
        break;
      case 'delete':
        this.deleteBulk();
        break;
      case 'active':
        this.activateBulk();
        break;
      case 'disabled':
        this.hideBulk();
        break;
      case 'featured':
        this.featureBulk();
        break;
      default:
        alert('Hành động không hợp lệ');
    }
  }

  // Lấy text trạng thái
  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Hiển thị';
      case 'featured': return 'Nổi bật';
      case 'disabled': return 'Đã ẩn';
      default: return status;
    }
  }

  filterStock(hasStock: boolean) {
    if (hasStock) {
      this.filteredProducts = this.products.filter(p => p.stock > 0);
    } else {
      this.filteredProducts = this.products.filter(p => p.stock === 0);
    }
    this.updatePagination();
  }

  resetFilter() {
    this.keyword = '';
    this.filteredProducts = [...this.products];
    this.updatePagination();
  }

  searchProduct() {
    if (!this.keyword) {
      this.filteredProducts = [...this.products];
    } else {
      const key = this.keyword.toLowerCase();
      this.filteredProducts = this.products.filter(p => {
        return (
          p.name?.toLowerCase().includes(key) ||
          p.category?.toLowerCase().includes(key) ||
          p.code?.toLowerCase().includes(key) ||
          p._id?.toLowerCase().includes(key) ||
          (p.description && p.description.toLowerCase().includes(key))
        );
      });
    }
    this.updatePagination();
    // Reset về trang 1 khi tìm kiếm
    this.currentPage = 1;
  }

  sort(field: string) {
    if (this.sortField === field) {
      this.sortDirection = -this.sortDirection;
    } else {
      this.sortField = field;
      this.sortDirection = 1;
    }

    this.filteredProducts.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        if (valA > valB) return this.sortDirection;
        if (valA < valB) return -this.sortDirection;
        return 0;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA > strB) return this.sortDirection;
      if (strA < strB) return -this.sortDirection;
      return 0;
    });

    this.changePage(this.currentPage);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayProducts = this.filteredProducts.slice(start, end);
    this.updateVisiblePages();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredProducts.length / this.pageSize);
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

  deleteProduct(id: string) {
    if (confirm("Bạn có chắc chắn muốn xoá sản phẩm này không?")) {
      this.productService.deleteProduct(id).subscribe(() => {
        alert("Đã xoá sản phẩm thành công!");
        this.loadProducts();
      });
    }
  }

  importExcel(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.importLoading = true;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      console.log('📊 Dữ liệu từ file Excel:', rows);

      // Xử lý từng dòng và tạo sản phẩm
      this.processImportData(rows);
    };
    reader.onerror = (error) => {
      console.error('Lỗi đọc file:', error);
      alert('Không thể đọc file. Vui lòng thử lại.');
      this.importLoading = false;
    };
    reader.readAsArrayBuffer(file);
  }

  // XỬ LÝ DỮ LIỆU IMPORT
  async processImportData(rows: any[]) {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Tạo map category để tìm nhanh
    const categoryMap = new Map();
    this.categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat._id);
      categoryMap.set(cat.code?.toLowerCase(), cat._id);
    });

    for (const row of rows) {
      try {
        // Chuẩn bị dữ liệu sản phẩm từ row
        const productData = this.mapExcelRowToProduct(row, categoryMap);

        if (!productData.name) {
          errors.push(`Thiếu tên sản phẩm: ${JSON.stringify(row)}`);
          errorCount++;
          continue;
        }

        // Kiểm tra xem sản phẩm đã tồn tại chưa (theo code)
        const existingProduct = this.products.find(p => p.code === productData.code);
        if (existingProduct) {
          // Nếu đã tồn tại, cập nhật
          await this.productService.updateProduct(existingProduct._id, productData).toPromise();
          successCount++;
        } else {
          // Nếu chưa tồn tại, tạo mới
          await this.productService.createProduct(productData).toPromise();
          successCount++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
        console.error('Lỗi import sản phẩm:', row, errorMessage);
        errors.push(`Lỗi: ${row.name || 'Không xác định'} - ${errorMessage}`);
        errorCount++;
      }
    }

    this.importLoading = false;
    alert(`Import hoàn tất!\nThành công: ${successCount}\nThất bại: ${errorCount}`);

    if (errors.length > 0) {
      console.log('Chi tiết lỗi:', errors);
    }

    // Reload danh sách
    this.loadProducts();

    // Reset input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  //  ÁNH XẠ DÒNG EXCEL SANG ĐỐI TƯỢNG SẢN PHẨM
  mapExcelRowToProduct(row: any, categoryMap: Map<string, string>): any {
    // Tìm category ID
    let categoryId = '';
    if (row['Danh mục'] || row['category']) {
      const categoryName = (row['Danh mục'] || row['category']).toLowerCase();
      categoryId = categoryMap.get(categoryName) || '';
    }

    // Xử lý variants từ Excel
    const variants = this.parseVariantsFromRow(row);

    // Tính tổng stock từ variants
    const totalStock = variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);

    return {
      code: row['Mã sản phẩm'] || row['code'] || '',
      name: row['Tên sản phẩm'] || row['name'] || '',
      category: categoryId,
      price: Number(row['Giá gốc'] || row['price'] || 0),
      discountPercent: Number(row['Giảm giá (%)'] || row['discountPercent'] || 0),
      stock: totalStock,
      description: row['Mô tả'] || row['description'] || '',
      status: this.mapStatus(row['Trạng thái'] || row['status']),
      isNew: (row['Mới'] === 'Có' || row['isNew'] === true),
      isBestSeller: (row['Bán chạy'] === 'Có' || row['isBestSeller'] === true),
      material: row['Chất liệu'] || row['material'] || '',
      variants: variants,
      images: [] // Ảnh cần upload riêng
    };
  }

  //  XỬ LÝ VARIANTS TỪ EXCEL
  parseVariantsFromRow(row: any): any[] {
    const variants: any[] = [];

    // Cách 1: Nếu có cột "Variants" chứa JSON
    if (row['Variants'] || row['variants']) {
      try {
        const parsed = JSON.parse(row['Variants'] || row['variants']);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Không phải JSON, tiếp tục xử lý cách khác
      }
    }

    // Cách 2: Nếu có các cột riêng cho từng size/color
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const colors = ['Đỏ', 'Xanh', 'Vàng', 'Hồng', 'Trắng', 'Đen', 'Be'];

    // Kiểm tra xem có cột nào là size không
    let hasSizeColumns = false;
    for (const size of sizes) {
      if (row[size] !== undefined) {
        hasSizeColumns = true;
        break;
      }
    }

    if (hasSizeColumns) {
      // Nếu có cột size, coi như mỗi size là một variant (không phân biệt màu)
      for (const size of sizes) {
        const quantity = Number(row[size] || 0);
        if (quantity > 0) {
          variants.push({
            size: size,
            color: 'Mặc định',
            quantity: quantity
          });
        }
      }
    } else {
      // Cách 3: Nếu có cột "Size" và "Color" riêng
      if (row['Size'] && row['Color'] && row['Số lượng']) {
        variants.push({
          size: row['Size'],
          color: row['Color'],
          quantity: Number(row['Số lượng'])
        });
      } else if (row['Size'] && row['Số lượng']) {
        variants.push({
          size: row['Size'],
          color: row['Color'] || 'Mặc định',
          quantity: Number(row['Số lượng'])
        });
      } else {
        // Nếu không có variant, tạo variant mặc định
        variants.push({
          size: 'M',
          color: 'Mặc định',
          quantity: Number(row['Tồn kho'] || row['stock'] || 0)
        });
      }
    }

    return variants.filter(v => v.quantity > 0);
  }

  //  ÁNH XẠ TRẠNG THÁI
  mapStatus(status: string): string {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'hiển thị' || statusLower === 'active') return 'active';
    if (statusLower === 'nổi bật' || statusLower === 'featured') return 'featured';
    if (statusLower === 'ẩn' || statusLower === 'disabled') return 'disabled';
    return 'active';
  }
}
