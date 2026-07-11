import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { DashboardService, Overview, RevenueData, TopProduct, RecentOrder, RecentReview, Alert } from '../../services/dashboard';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private revenueChart: Chart | null = null;

  // Khai báo tất cả properties
  overview: Overview | null = null;
  revenueData: RevenueData[] = [];
  topProducts: TopProduct[] = [];
  recentOrders: RecentOrder[] = [];
  recentReviews: RecentReview[] = [];
  alerts: Alert | null = null;

  // Loading states
  loading = {
    overview: false,
    chart: false,
    topProducts: false,
    recent: false,
    alerts: false
  };

  constructor(
    private dashboardService: DashboardService
  ) { }

  ngOnInit() {
    this.loadAllData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.revenueChart) {
      this.revenueChart.destroy();
    }
  }

  // Load tất cả dữ liệu
  loadAllData() {
    this.loadOverview();
    this.loadRevenueChart();
    this.loadTopProducts();
    this.loadRecentOrders();
    this.loadRecentReviews();
    this.loadAlerts();
  }

  // Refresh data
  refreshData() {
    this.loadAllData();
  }

  // Load overview
  loadOverview() {
    this.loading.overview = true;
    this.dashboardService.getOverview()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.overview = data;
          this.loading.overview = false;
        },
        error: (err) => {
          console.error('Lỗi load overview:', err);
          this.loading.overview = false;
        }
      });
  }

  // Load revenue chart
  loadRevenueChart() {
    this.loading.chart = true;
    this.dashboardService.getRevenueChart()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // LOG ĐỂ XEM DỮ LIỆU THỰC TẾ
          console.log('========== REVENUE DATA FROM API ==========');
          console.log('Raw data:', JSON.stringify(data, null, 2));
          data.forEach((item, index) => {
            console.log(`Item ${index}: date="${item.date}", type=${typeof item.date}`);
          });

          this.revenueData = data;
          setTimeout(() => this.initRevenueChart(), 100);
          this.loading.chart = false;
        },
        error: (err) => {
          console.error('Lỗi load revenue chart:', err);
          this.loading.chart = false;
        }
      });
  }

  // Load top products
  loadTopProducts() {
    this.loading.topProducts = true;
    this.dashboardService.getTopProducts(5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.topProducts = data;
          this.loading.topProducts = false;
        },
        error: (err) => {
          console.error('Lỗi load top products:', err);
          this.loading.topProducts = false;
        }
      });
  }

  // Load recent orders
  loadRecentOrders() {
    this.loading.recent = true;
    this.dashboardService.getRecentOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.recentOrders = data;
          this.loading.recent = false;
        },
        error: (err) => {
          console.error('Lỗi load recent orders:', err);
          this.loading.recent = false;
        }
      });
  }

  // Load recent reviews
  loadRecentReviews() {
    this.dashboardService.getRecentReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.recentReviews = data;
        },
        error: (err) => console.error('Lỗi load recent reviews:', err)
      });
  }

  // Load alerts
  loadAlerts() {
    this.loading.alerts = true;
    this.dashboardService.getAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.alerts = data;
          this.loading.alerts = false;
        },
        error: (err) => {
          console.error('Lỗi load alerts:', err);
          this.loading.alerts = false;
        }
      });
  }

  // Helper: Format date từ string mà không bị lệch múi giờ
  private formatDateString(dateString: string): string {
    if (!dateString) return '';

    // Xử lý các định dạng khác nhau
    let dateStr = dateString;

    // Nếu có chứa 'T', lấy phần trước T
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }

    // Nếu có chứa '+', lấy phần trước +
    if (dateStr.includes('+')) {
      dateStr = dateStr.split('+')[0];
    }

    // Tách năm-tháng-ngày
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // parts = [year, month, day]
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return dateStr;
  }

  // Helper: Format date cho chart (chỉ lấy ngày/tháng)
  private formatChartLabel(dateString: string): string {
    if (!dateString) return '';

    let dateStr = dateString;
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    if (dateStr.includes('+')) {
      dateStr = dateStr.split('+')[0];
    }

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10);
      return `Ngày ${day}/${month}`;
    }

    return dateStr;
  }

  // Khởi tạo biểu đồ - FIX HOÀN TOÀN
  initRevenueChart() {
    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.revenueChart) {
      this.revenueChart.destroy();
    }

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        // FIX: Format trực tiếp từ chuỗi, không dùng new Date()
        labels: this.revenueData.map(d => {
          // d.date có dạng "2026-03-23"
          const parts = d.date.split('-');
          if (parts.length === 3) {
            const day = parseInt(parts[2], 10);
            const month = parseInt(parts[1], 10);
            return `Ngày ${day}/${month}`;
          }
          return d.date;
        }),
        datasets: [
          {
            label: 'Doanh thu (VNĐ)',
            data: this.revenueData.map(d => d.revenue),
            borderColor: '#fb6f92',
            backgroundColor: 'rgba(251, 111, 146, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Số đơn hàng',
            data: this.revenueData.map(d => d.orders),
            borderColor: '#ffc2d1',
            backgroundColor: 'rgba(255, 194, 209, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                let value = context.raw as number;
                if (label === 'Doanh thu (VNĐ)') {
                  return `${label}: ${new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                  }).format(value)}`;
                }
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: {
              callback: function (value) {
                const numValue = Number(value);
                if (numValue >= 1000000) {
                  return (numValue / 1000000).toFixed(1) + 'M';
                }
                if (numValue >= 1000) {
                  return (numValue / 1000).toFixed(0) + 'K';
                }
                return numValue;
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              stepSize: 1,
              callback: function (value) {
                return Number(value).toFixed(0);
              }
            }
          }
        }
      }
    });
  }

  // Helper functions - ĐÃ SỬA formatDate
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    let dateStr = dateString;
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return dateStr;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Đang xử lý': return 'badge-warning';
      case 'Đang giao': return 'badge-info';
      case 'Đã giao': return 'badge-success';
      case 'Đã hủy': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  // Sửa lỗi trong template
  getInStockPercentage(): number {
    const total = this.overview?.products?.total || 0;
    const outOfStock = this.overview?.products?.outOfStock || 0;
    const lowStock = this.overview?.products?.lowStock || 0;

    // Số sản phẩm còn hàng (total - outOfStock)
    const inStock = total - outOfStock;

    if (total === 0) return 0;
    return (inStock / total) * 100;
  }

  getProductTotal(): number {
    return this.overview?.products?.total || 1;
  }
}