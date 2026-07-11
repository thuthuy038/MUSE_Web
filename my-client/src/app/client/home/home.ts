import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ProductService } from '../../services/product';
import { Router, RouterLink } from '@angular/router';
import { IProduct } from '../../interfaces/product';
import { HttpClient } from '@angular/common/http';
import { Product } from '../product/product';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Product, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  providers: [DecimalPipe]
})
export class Home implements OnInit, OnDestroy {

  current = 0;
  autoSlideInterval: any;

  banners: any[] = [];

  newProducts: IProduct[] = [];
  newProductsDisplay: IProduct[] = [];
  allProducts: IProduct[] = [];
  allProductsDisplay: IProduct[] = [];

  newIndex = 0;
  newPerLoad = 4;
  showPrev = false;
  showNext = false;

  productsPerLoad = 9;
  currentLoaded = 9;

  categories: any[] = [];

  constructor(
    private productService: ProductService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {

    // LOAD CATEGORY
    this.http.get<any[]>("http://localhost:3000/api/categories")
      .subscribe(res => {
        this.categories = res.filter(c => c.type === 'category');
      });

    // LOAD BANNER
    this.http.get<any[]>("http://localhost:3000/api/banners")
      .subscribe(res => {
        this.banners = res.filter(b => b.status === 'active');
        setTimeout(() => this.showBanner(this.current), 0);
      });

    // AUTO SLIDE
    this.autoSlideInterval = setInterval(() => this.next(), 5000);

    // PRODUCTS
    this.productService.getProducts().subscribe(products => {
      const activeProducts = products.filter(p => p.status === 'active' || p.status === 'featured');
      this.allProducts = [...activeProducts].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      this.newProducts = this.allProducts.slice(0, 20);
      this.updateNewDisplay();

      this.allProductsDisplay = this.allProducts.slice(0, this.productsPerLoad);
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.autoSlideInterval);
  }

  getProductImage(img: any): string {
    if (!img) return '';

    if (typeof img === 'object' && img.url) {
      return 'http://localhost:3000' + img.url;
    }

    if (typeof img === 'string') {
      if (img.startsWith('http')) return img;
      return 'http://localhost:3000' + img;
    }

    return '';
  }

  // FIX CATEGORY IMAGE
  getCategoryImage(cat: any, index: number): string {
    if (!cat.banner || cat.banner.length === 0) {
      return 'assets/images/no-image.png';
    }

    if (cat.banner.length === 1) {
      return 'http://localhost:3000' + cat.banner[0].url;
    }

    if (cat.banner[index]) {
      return 'http://localhost:3000' + cat.banner[index].url;
    }

    return 'http://localhost:3000' + cat.banner[0].url;
  }

  getImageUrl(imageId: string) {
    return `http://localhost:3000/api/images/${imageId}`;
  }

  showBanner(index: number) {
    const banners = document.querySelectorAll('.banner-slider > div') as NodeListOf<HTMLElement>;
    banners.forEach((b, i) => (b.style.opacity = i === index ? '1' : '0'));
  }

  prev() {
    this.current = (this.current - 1 + this.banners.length) % this.banners.length;
    this.showBanner(this.current);
  }

  next() {
    this.current = (this.current + 1) % this.banners.length;
    this.showBanner(this.current);
  }

  updateNewDisplay() {
    this.newProductsDisplay = this.newProducts.slice(this.newIndex, this.newIndex + this.newPerLoad);
    this.showPrev = this.newIndex > 0;
    this.showNext = this.newIndex + this.newPerLoad < this.newProducts.length;
  }

  nextNewProducts() {
    if (this.newIndex + this.newPerLoad < this.newProducts.length) {
      this.newIndex += this.newPerLoad;
      this.updateNewDisplay();
    }
  }

  prevNewProducts() {
    if (this.newIndex > 0) {
      this.newIndex -= this.newPerLoad;
      this.updateNewDisplay();
    }
  }

  loadMoreProducts() {
    const nextCount = this.currentLoaded + this.productsPerLoad;
    this.allProductsDisplay = this.allProducts.slice(0, nextCount);
    this.currentLoaded = nextCount;
  }

  hasMoreProducts(): boolean {
    return this.currentLoaded < this.allProducts.length;
  }

  goToProductDetail(id: string) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.router.navigate(['/productdetail', id]);
  }
goToBannerLink(link: string) {
  if (!link || link.trim() === '') return;

  // nếu link có domain thì bỏ domain
  if (link.includes('localhost')) {
    const url = new URL(link);
    link = url.pathname;
  }

  // bỏ dấu / đầu
  link = link.replace('/', '');

  this.router.navigate([link]);
}
  goToCategory(categoryId: string) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.router.navigate(['/productlist'], {
      queryParams: { category: categoryId }
    });
  }
}