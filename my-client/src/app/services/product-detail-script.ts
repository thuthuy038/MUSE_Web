import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { Observable, of } from 'rxjs'; 
import { catchError, map } from 'rxjs/operators'; 
import { IReview } from '../interfaces/review';

@Injectable({
  providedIn: 'root'
})
export class ProductDetailScriptService {

  private reviewsUrl = 'assets/data/reviews.json'; 

  constructor(private http: HttpClient) { }

  public initProductScripts(productId: string | null): void { 
    setTimeout(() => {
      this.setupThumbnails();
      this.setupReviewFilters(productId); 
    }, 100); 
  }

  setupThumbnails(): void {
    const mainImage = document.getElementById("mainImage") as HTMLImageElement;
    const thumbnails = document.querySelectorAll(".thumbnails img");
    if (mainImage && thumbnails.length > 0) {
      if (thumbnails[0]) {
        thumbnails[0].classList.add('active');
      }
      thumbnails.forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          const target = e.target as HTMLImageElement;
          if (mainImage) mainImage.src = target.src;
          thumbnails.forEach(t => t.classList.remove('active'));
          target.classList.add('active');
        });
      });
    }
  }

  setupReviewFilters(productId: string | null): void {
    if (!productId) {
      console.error("Không có Product ID để tải review.");
      return; 
    }

    this.getReviewsByProductId(productId).subscribe(allReviews => {
      
      const reviewListContainer = document.getElementById("review-list-container");
      const filterButtons = document.querySelectorAll('.rating-filters .filter-btn');

      if (!reviewListContainer || !filterButtons) return;

      function renderReviews(filter: string) {
        if (!reviewListContainer) return;
        reviewListContainer.innerHTML = '';
        const filteredReviews = allReviews.filter(review => {
          if (filter === 'all') return true;
          if (filter === 'photo') return review.hasPhoto;
          return review.stars == parseInt(filter);
        });
        if (filteredReviews.length === 0) {
          reviewListContainer.innerHTML = '<p style="margin-left: 20px;">Không có đánh giá nào phù hợp.</p>';
          return;
        }
        filteredReviews.forEach(review => {
          const starsHTML = '⭐'.repeat(review.stars) + (review.stars < 5 ? '<span style="color: #ccc;">' + '⭐'.repeat(5 - review.stars) + '</span>' : '');
          const reviewHTML = `
            <div class="review-item">
              <div class="review-item-header">
                <div class="review-avatar"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgMmM1LjUyMyAwIDEwIDQuNDc3IDEwIDEwcy00LjQ3NyAxMC0xMCAxMFMxMiAyLjQ3NyAxMiAyem0wIDJjNC40MTIgMCA4IDMuNTg4IDggOHMtMy41ODggOC04IDgtOC0zLjU4OC04LTggMy41ODgtOCA4LTJ6bTAgM2E0IDQgMCAwIDAgMCA4IDQgNCAwIDAgMCAwLTh6bTAgMWEzIDMgMCAwIDEgMCA2IDMgMyAwIDAgMSAwLTYiIGZpbGw9IiM4ODgiLz48L3N2Zz4=" alt="avatar"></div>
                <div>
                  <div class="review-author">${review.author}</div>
                  <div class="review-author-stars">${starsHTML}</div>
                </div>
              </div>
              <div class="review-meta">${review.date} | Phân loại hàng: ${review.variant}</div>
              <div class="review-text">${review.text}</div>
              ${review.hasPhoto ? '<div class="review-photo-indicator">[Có hình ảnh/video]</div>' : ''}
            </div>
          `;
          reviewListContainer.innerHTML += reviewHTML;
        });
      }

      filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          const filterValue = button.getAttribute('data-filter');
          filterButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          if (filterValue) renderReviews(filterValue);
        });
      });

      renderReviews('all');

    });
  }

  private getReviewsByProductId(id: string): Observable<IReview[]> {
    return this.http.get<{ [key: string]: IReview[] }>(this.reviewsUrl).pipe(
      map(response => {
        return response[id] || []; 
      }),
      catchError(error => {
        console.error('Lỗi tải reviews.json:', error);
        return of([]); 
      })
    );
  }
}