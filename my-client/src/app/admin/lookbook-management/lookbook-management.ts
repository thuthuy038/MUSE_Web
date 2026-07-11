import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-lookbook-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './lookbook-management.html',
  styleUrls: ['./lookbook-management.css']
})
export class LookbookManagement implements OnInit {
  allProducts: any[] = [];
  categories: any[] = [];
  lookbookList: any[] = [];
  displayList: any[] = [];

  filterType: 'all' | 'mixed' | 'none' = 'all';
  filterCategory: string = '';

  searchMain: string = '';
  filteredMain: any[] = [];
  selectedMain: any = null;

  searchMatch: string = '';
  filteredMatch: any[] = [];
  selectedMatches: any[] = [];

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    forkJoin({
      products: this.http.get<any[]>('https://server-testing-ymn9.onrender.com/api/products'),
      categories: this.http.get<any[]>('https://server-testing-ymn9.onrender.com/api/categories'),
      lookbooks: this.http.get<any[]>('https://server-testing-ymn9.onrender.com/api/lookbook')
    }).subscribe({
      next: (res: any) => {
        this.allProducts = res.products.filter((p: any) => p !== null);
        this.categories = res.categories;
        // Giữ lại các lookbook có sản phẩm chính hợp lệ
        this.lookbookList = res.lookbooks.filter((lb: any) => lb.mainProductId !== null);
        this.applyFilter();
      },
      error: (err: any) => console.error('Lỗi load data:', err)
    });
  }

  // HÀM QUAN TRỌNG: Ép kiểu ID về string để so sánh không bao giờ sai
  private getSafeId(productId: any): string {
    if (!productId) return '';
    return typeof productId === 'object' ? productId._id : productId;
  }

  getMatchingItems(productId: string): any[] {
    const lb = this.lookbookList.find(l => this.getSafeId(l.mainProductId) === productId);
    if (!lb || !lb.matchingItems) return [];
    return lb.matchingItems.filter((m: any) => m !== null);
  }

  getMatchingNames(productId: string): string[] {
    const lb = this.lookbookList.find(l => this.getSafeId(l.mainProductId) === productId);
    if (!lb) return [];

    // Ưu tiên lấy từ mảng tên đã lưu cứng
    if (lb.matchingItemNames && lb.matchingItemNames.length > 0) {
      return lb.matchingItemNames;
    }
    return this.getMatchingItems(productId).map(m => m.name);
  }

  applyFilter() {
    let filtered = [...this.allProducts];
    if (this.filterType !== 'all') {
      filtered = filtered.filter(p => {
        const hasSet = this.lookbookList.some(lb => this.getSafeId(lb.mainProductId) === p._id);
        return this.filterType === 'mixed' ? hasSet : !hasSet;
      });
    }
    if (this.filterCategory) {
      filtered = filtered.filter(p => {
        const pCatId = (typeof p.category === 'object') ? p.category?._id : p.category;
        return pCatId === this.filterCategory;
      });
    }
    this.displayList = filtered;
  }

  setFilter(type: 'all' | 'mixed' | 'none') {
    this.filterType = type;
    this.applyFilter();
  }

  getImg(p: any) {
    if (p?.images?.[0]?.url) return `https://server-testing-ymn9.onrender.com${p.images[0].url}`;
    return 'assets/images/no-image.png';
  }

  filterProducts(type: 'main' | 'match') {
    const term = type === 'main' ? this.searchMain : this.searchMatch;
    if (!term.trim()) {
      type === 'main' ? this.filteredMain = [] : this.filteredMatch = [];
      return;
    }
    const results = this.allProducts.filter(p => p.name.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
    if (type === 'main') this.filteredMain = results;
    else this.filteredMatch = results;
  }

  selectMain(p: any) {
    this.selectedMain = p;
    this.searchMain = '';
    this.filteredMain = [];
    const existing = this.lookbookList.find(l => this.getSafeId(l.mainProductId) === p._id);
    this.selectedMatches = existing ? (existing.matchingItems ? existing.matchingItems.filter((m: any) => m !== null) : []) : [];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addMatch(p: any) {
    if (!this.selectedMain || this.selectedMain._id === p._id) return;
    if (!this.selectedMatches.find(m => m._id === p._id)) {
      this.selectedMatches.push(p);
    }
    this.searchMatch = '';
    this.filteredMatch = [];
  }

  removeMatch(id: string) {
    this.selectedMatches = this.selectedMatches.filter(m => m._id !== id);
  }

  saveLookbook() {
    const data = {
      mainProductId: this.selectedMain._id,
      mainProductName: this.selectedMain.name,
      mainProductCode: this.selectedMain.code,
      matchingItems: this.selectedMatches.map(m => m._id),
      matchingItemNames: this.selectedMatches.map(m => m.name)
    };
    this.http.post('https://server-testing-ymn9.onrender.com/api/lookbook', data).subscribe({
      next: () => {
        alert('✨ Đã lưu set đồ thành công!');
        this.loadInitialData();
        this.resetForm();
      },
      error: (err: any) => alert('Lỗi: ' + err.message)
    });
  }

  deleteLBByProduct(productId: string) {
    const lb = this.lookbookList.find(l => this.getSafeId(l.mainProductId) === productId);
    if (lb && confirm('Xóa set này nha nàng?')) {
      this.http.delete(`https://server-testing-ymn9.onrender.com/api/lookbook/${lb._id}`).subscribe(() => this.loadInitialData());
    }
  }

  goToDetail(productId: string) {
    if (productId) {
      this.router.navigate(['/productdetail', productId]);
    }
  }

  resetForm() {
    this.selectedMain = null;
    this.selectedMatches = [];
    this.searchMain = '';
    this.searchMatch = '';
    this.filteredMain = [];
    this.filteredMatch = [];
  }
}