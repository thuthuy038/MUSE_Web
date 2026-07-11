import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../services/category';
import { ICategory } from '../../interfaces/category';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter.html',
  styleUrls: ['./filter.css'],
})
export class Filter implements OnInit {
  @Input() defaultCategory: string | null = null;
  @Output() applyFilters = new EventEmitter<any>();
  @Output() resetFilters = new EventEmitter<void>();

  categories: ICategory[] = [];
  selectedCategories: { [id: string]: boolean } = {};

  sizes = ['S', 'M', 'L', 'XL'];
  selectedSize: string | null = null;

  minPrice: number | null = null;
  maxPrice: number | null = null;

  // ⭐ THÊM CÁI NÀY
  selectedRating: number | null = null;

  constructor(
    private categoryService: CategoryService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.categoryService.getCategories().subscribe(data => {
      this.categories = data;

      this.route.queryParams.subscribe(params => {
        const catId = params['category'];
        if (catId === 'all' || !catId) {
          this.selectedCategories = { all: true };
        } else {
          this.selectedCategories = { [catId]: true };
        }
        this.applyFiltersFn();
      });
    });
  }

  onCategoryChange(categoryId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (categoryId === 'all') {
      this.selectedCategories = { all: checked };
    } else {
      this.selectedCategories[categoryId] = checked;
      if (checked) this.selectedCategories['all'] = false;
    }
    this.applyFiltersFn();
  }

  selectSize(size: string) {
    this.selectedSize = this.selectedSize === size ? null : size;
    this.applyFiltersFn();
  }

  // ⭐ chọn sao
  selectRating(rating: number) {
    this.selectedRating = this.selectedRating === rating ? null : rating;
    this.applyFiltersFn();
  }

  resetFiltersFn() {
    this.selectedCategories = { all: true };
    this.selectedSize = null;
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedRating = null; // reset sao
    this.resetFilters.emit();
  }

  applyFiltersFn() {
    const categoryIds = Object.keys(this.selectedCategories).filter(id => this.selectedCategories[id]);

    this.applyFilters.emit({
      categories: categoryIds,
      size: this.selectedSize,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      rating: this.selectedRating
    });
  }
}