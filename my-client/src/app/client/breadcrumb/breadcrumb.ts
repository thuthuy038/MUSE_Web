import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, Observable, startWith } from 'rxjs';

import { CommonModule } from '@angular/common';
import { Input } from '@angular/core';
import { CategoryService } from '../../services/category';
import { ICategory } from '../../interfaces/category';

export interface BreadcrumbItem {
  label: string;
  url: string | null; 
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
})
export class Breadcrumb implements OnInit {
  @Input() items: BreadcrumbItem[] | null = null;
  public breadcrumbs$: Observable<BreadcrumbItem[]>;
  private categoryNameMap: { [key: string]: string } = {};

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private categoryService: CategoryService
  ) {
    this.breadcrumbs$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null as NavigationEnd | null), 
      map(() => this.buildBreadcrumbs()) 
    );
  }

  ngOnInit() {
    this.categoryService.getCategories().subscribe((data: ICategory[]) => {
      data.forEach(cat => {
        this.categoryNameMap[cat.key] = cat.name;
      });
      this.breadcrumbs$ = this.breadcrumbs$.pipe(
          startWith(this.buildBreadcrumbs())
      );
    });
  }

  private buildBreadcrumbs(): BreadcrumbItem[] {
    let breadcrumbs: BreadcrumbItem[] = [];
    
    breadcrumbs.push({ label: 'Trang chủ', url: '/' });

    const routeSnapshot = this.route.root.snapshot.firstChild;
    
    if (routeSnapshot && routeSnapshot.url.length > 0 && routeSnapshot.url[0].path === 'productlist') {
        const params = routeSnapshot.queryParams;
        const categoryKey = params['category'] || 'all';

        const categoryName = this.categoryNameMap[categoryKey] || 'Tất cả Sản phẩm';
        
        breadcrumbs.push({ 
            label: categoryName, 
            url: `/productlist?category=${categoryKey}` 
        });
    }

    if (this.router.url.startsWith('/cart')) {
        breadcrumbs.push({ label: 'Giỏ hàng', url: '/cart' });
    }

    return breadcrumbs;
  }
}
