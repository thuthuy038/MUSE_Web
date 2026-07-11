import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { IReview } from '../../interfaces/review'
import { ReviewService } from '../../services/review'

@Component({
  selector: 'app-review-management',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './review-management.html',
  styleUrl: './review-management.css'
})

export class ReviewManagementComponent implements OnInit {

  comments: IReview[] = []
  filteredComments: IReview[] = []
  paginatedComments: IReview[] = []

  searchText = ""

  filterStatus = "all"
  filterRating = "all"

  startDate = ""
  endDate = ""

  sortType = "newest"

  currentPage = 1
  pageSize = 5

  constructor(private reviewService: ReviewService) { }

  ngOnInit() {
    this.loadComments()
  }

  loadComments() {
    this.reviewService.getReviews().subscribe({
      next: (res: any) => {

        this.comments = res.data || []
        this.filteredComments = [...this.comments]

        this.currentPage = 1
        this.updatePagination()

      },
      error: (err: any) => console.log(err)
    })
  }

  updatePagination() {
    const start = (this.currentPage - 1) * this.pageSize

    this.paginatedComments = this.filteredComments.slice(
      start,
      start + this.pageSize
    )
  }

  onSearch(value: string) {
    this.searchText = value.toLowerCase()
    this.applyFilter()
  }
  getRatingLabel(): string {
    if (this.filterRating === 'all') return 'Số sao'

    const stars = Number(this.filterRating)
    return '⭐'.repeat(stars)
  }
  getStatusLabel(): string {
    switch (this.filterStatus) {
      case 'replied': return 'Đã phản hồi'
      case 'pending': return 'Chưa phản hồi'
      default: return 'Trạng thái'
    }
  }

  getSortLabel(): string {
    switch (this.sortType) {
      case 'newest': return 'Mới nhất'
      case 'oldest': return 'Cũ nhất'
      case 'ratingHigh': return '⭐ Cao'
      case 'ratingLow': return '⭐ Thấp'
      default: return 'Sắp xếp'
    }
  }

  setFilter(status: string) {
    this.filterStatus = status
    this.applyFilter()
  }

  setRatingFilter(rating: string) {
    this.filterRating = rating
    this.applyFilter()
  }

  setStartDate(date: string) {
    this.startDate = date
    this.applyFilter()
  }

  setEndDate(date: string) {
    this.endDate = date
    this.applyFilter()
  }

  setSort(type: string) {
    this.sortType = type
    this.applyFilter()
  }

  applyFilter() {

    let data = [...this.comments]

    if (this.filterStatus === "replied") {
      data = data.filter(c => c.status === "replied")
    }

    if (this.filterStatus === "pending") {
      data = data.filter(c => c.status === "pending")
    }

    if (this.filterRating !== "all") {
      data = data.filter(c => (c.rating || 0) === Number(this.filterRating))
    }

    if (this.startDate) {
      const start = new Date(this.startDate).getTime()
      data = data.filter(c => new Date(c.createdAt || '').getTime() >= start)
    }

    if (this.endDate) {
      const end = new Date(this.endDate).getTime()
      data = data.filter(c => new Date(c.createdAt || '').getTime() <= end)
    }

    if (this.searchText) {

      data = data.filter(c =>

        (c.customerName || '').toLowerCase().includes(this.searchText) ||
        (c.productName || '').toLowerCase().includes(this.searchText) ||
        (c.content || '').toLowerCase().includes(this.searchText)

      )

    }

    if (this.sortType === "newest") {
      data.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    }

    if (this.sortType === "oldest") {
      data.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime())
    }

    if (this.sortType === "ratingHigh") {
      data.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    }

    if (this.sortType === "ratingLow") {
      data.sort((a, b) => (a.rating || 0) - (b.rating || 0))
    }

    this.filteredComments = [...data]

    this.currentPage = 1

    this.updatePagination()
  }

  get totalItems() {
    return this.filteredComments.length
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize))
  }

  get startItem() {

    if (this.totalItems === 0) return 0

    return (this.currentPage - 1) * this.pageSize + 1
  }

  get endItem() {

    return Math.min(
      this.currentPage * this.pageSize,
      this.totalItems
    )
  }

  goToPage(page: any) {

    if (page === "...") return

    if (page < 1 || page > this.totalPages) return

    this.currentPage = page

    this.updatePagination()
  }

  get paginationItems(): (number | string)[] {

    const pages: (number | string)[] = []

    if (this.totalPages <= 5) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i)
      }
      return pages
    }

    pages.push(1)

    if (this.currentPage > 3) {
      pages.push("...")
    }

    const start = Math.max(2, this.currentPage - 1)
    const end = Math.min(this.totalPages - 1, this.currentPage + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (this.currentPage < this.totalPages - 2) {
      pages.push("...")
    }

    pages.push(this.totalPages)

    return pages
  }

}