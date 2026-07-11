import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { BannerForm } from '../banner-form/banner-form'

import { BannerService } from '../../services/banner'
import { Banner } from '../../interfaces/banner'

@Component({
  selector: 'app-banner-management',
  standalone: true,
  imports: [CommonModule, FormsModule, BannerForm],
  templateUrl: './banner-management.html',
  styleUrls: ['./banner-management.css']
})

export class BannerManagement {

  banners: Banner[] = []
  filteredBanners: Banner[] = []

  selectedBanner: Banner | null = null

  showForm = false
  showDeletePopup = false

  deleteId: string | null = null

  searchText = ''
  statusFilter = 'all'

  currentPage = 1
  itemsPerPage = 4

  toastMessage = ''
  showToast = false

  selectedBanners: string[] = []

  constructor(private bannerService: BannerService) {}

  ngOnInit() {
    this.loadBanners()
  }

  // LOAD BANNERS
  loadBanners() {

    this.bannerService.getBanners()
      .subscribe({
        next: (res) => {

          this.banners = res || []

          this.applyFilters()

        },
        error: (err) => console.log(err)
      })

  }

  // SEARCH + FILTER
  applyFilters() {

    let data = [...this.banners]

    const keyword = (this.searchText || '')
      .toLowerCase()
      .replace(/\s+/g,'')
      .trim()

    if (keyword !== '') {

      data = data.filter(b => {

        const title = (b.title || '')
          .toLowerCase()
          .replace(/\s+/g,'')

        return title.includes(keyword)

      })

    }

    if (this.statusFilter !== 'all') {

      data = data.filter(b =>
        b.status === this.statusFilter
      )

    }

    this.filteredBanners = data

    this.selectedBanners = []

    this.currentPage = 1

  }

  filterStatus(status: string) {

    this.statusFilter = status

    this.selectedBanners = []

    this.applyFilters()

  }

  // ADD
  addBanner() {

    this.selectedBanner = null
    this.showForm = true

  }

  // EDIT
  editBanner(banner: Banner) {

    this.selectedBanner = banner
    this.showForm = true

  }

  closeForm() {

    this.showForm = false

    this.loadBanners()

  }

  // DELETE SINGLE
  deleteBanner(id: string) {

    this.deleteId = id

    this.showDeletePopup = true

  }

  cancelDelete() {

    this.showDeletePopup = false

  }

  confirmDelete() {

    if (!this.deleteId) return

    this.bannerService.deleteBanner(this.deleteId)
      .subscribe({
        next: () => {

          this.showToastMessage('Xóa banner thành công')

          this.showDeletePopup = false

          this.loadBanners()

        },
        error: (err) => console.log(err)
      })

  }

  // SELECT
  toggleSelect(id: string, event: any) {

    if (event.target.checked) {

      if (!this.selectedBanners.includes(id)) {
        this.selectedBanners.push(id)
      }

    } else {

      this.selectedBanners =
        this.selectedBanners.filter(b => b !== id)

    }

  }

  toggleSelectAll(event: any) {

    if (event.target.checked) {

      this.selectedBanners =
        this.filteredBanners.map(b => b._id)

    } else {

      this.selectedBanners = []

    }

  }

  // DELETE MULTIPLE
  deleteSelected() {

    if (this.selectedBanners.length === 0) return

    if (!confirm('Xóa các banner đã chọn?')) return

    this.selectedBanners.forEach(id => {

      this.bannerService.deleteBanner(id)
        .subscribe({
          next: () => {

            this.loadBanners()

          },
          error: (err) => console.log(err)
        })

    })

    this.selectedBanners = []

  }

  // TOGGLE STATUS
  toggleStatus(banner: Banner) {

    const newStatus =
      banner.status === 'active'
        ? 'hidden'
        : 'active'

    this.bannerService.updateBanner(
      banner._id,
      { ...banner, status: newStatus }
    ).subscribe({
      next: () => {

        this.showToastMessage('Đã cập nhật trạng thái')

        this.loadBanners()

      },
      error: (err) => console.log(err)
    })

  }

  // PAGINATION
  get paginatedBanners() {

    const start =
      (this.currentPage - 1) * this.itemsPerPage

    return this.filteredBanners.slice(
      start,
      start + this.itemsPerPage
    )

  }

  get totalPages() {

    return Math.ceil(
      this.filteredBanners.length / this.itemsPerPage
    )

  }

  get pages() {

    return Array(this.totalPages)
      .fill(0)
      .map((x, i) => i + 1)

  }

  changePage(page: number) {

    this.currentPage = page

    this.selectedBanners = []

  }

  prevPage() {

    if (this.currentPage > 1) {

      this.currentPage--

      this.selectedBanners = []

    }

  }

  nextPage() {

    if (this.currentPage < this.totalPages) {

      this.currentPage++

      this.selectedBanners = []

    }

  }

  // PAGE INFO
  get startItem() {

    if (this.filteredBanners.length === 0) return 0

    return (this.currentPage - 1) * this.itemsPerPage + 1

  }

  get endItem() {

    const end = this.currentPage * this.itemsPerPage

    return end > this.filteredBanners.length
      ? this.filteredBanners.length
      : end

  }

  // TOAST
  showToastMessage(message: string) {

    this.toastMessage = message

    this.showToast = true

    setTimeout(() => {

      this.showToast = false

    }, 2500)

  }

}