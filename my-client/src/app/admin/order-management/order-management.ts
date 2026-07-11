import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; 
import * as XLSX from 'xlsx';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css',
})
export class OrderManagement implements OnInit {
  orders: any[] = [];
  allOrders: any[] = [];
  searchText: string = '';
  
  selectedDeliveryStatus: string = ''; 
  selectedPaymentStatus: string = '';  
  selectedTimeSort: string = 'newest'; // Đảm bảo luôn có giá trị mặc định
  totalPriceSort: 'asc' | 'desc' | null = null;
  
  selectedIds: Set<string> = new Set();
  editingId: string | null = null;
  editData: any = {};

  currentPage: number = 1;
  itemsPerPage: number = 10; 
  totalPages: number = 1;

  deliveryStatusOptions = [
    { label: 'Trạng thái giao hàng', value: '', color: '#f3a5b9' },
    { label: 'Đang xử lý', value: 'Đang xử lý', color: '#86bcdb' },        
    { label: 'Đang giao', value: 'Đang giao', color: '#ffc107' },            
    { label: 'Đã giao', value: 'Đã giao', color: '#28a745' },
    { label: 'Đã hủy', value: 'Đã hủy', color: '#6c757d' }
  ];

  paymentStatusOptions = [
    { label: 'Trạng thái thanh toán', value: '', color: '#f3a5b9' },
    { label: 'Đã thanh toán', value: 'Đã thanh toán', color: '#28a745' },
    { label: 'Chưa thanh toán', value: 'Chưa thanh toán', color: '#dc3545' }
  ];

  timeSortOptions = [
    { label: 'Mới nhất', value: 'newest' },
    { label: 'Cũ nhất', value: 'oldest' }
  ];

  private apiUrl = 'https://server-testing-ymn9.onrender.com/api/orders';

  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) {}

  ngOnInit(): void { this.loadOrders(); }

  loadOrders(): void {
    this.http.get<any[]>(this.apiUrl).subscribe(data => {
      console.log('Orders data:', data);
    console.log('First order paymentId:', data[0]?.paymentId);
      this.allOrders = data;
      this.onSearch();
    });
  }

  // FIX: Sửa hàm này để không làm mất chữ ở bộ lọc thời gian
  togglePriceSort() {
    // Thay vì gán 'all', ta giữ nguyên hoặc gán về giá trị mặc định để giao diện không bị trống
    if (this.totalPriceSort === 'desc') {
      this.totalPriceSort = 'asc';
    } else {
      this.totalPriceSort = 'desc';
    }
    this.onSearch();
  }

  onSearch() {
    const term = this.searchText.toLowerCase().trim();
    let filtered = this.allOrders.filter(o => {
      const orderId = o.id?.toLowerCase() || '';
      const customerId = o.customerId?.toLowerCase() || '';
      const customerName = (o.shippingAddress?.fullName || o.customerName || '').toLowerCase();

      const matchesSearch = orderId.includes(term) || customerId.includes(term) || customerName.includes(term);
      const matchesDelivery = this.selectedDeliveryStatus === '' || o.status === this.selectedDeliveryStatus;
     const matchesPayment = this.selectedPaymentStatus === '' || (o.paymentId?.paymentStatus || 'Chưa thanh toán') === this.selectedPaymentStatus;
      
      return matchesSearch && matchesDelivery && matchesPayment;
    });

    if (this.totalPriceSort) {
      filtered.sort((a, b) => {
        return this.totalPriceSort === 'desc' 
          ? (b.totalPrice || 0) - (a.totalPrice || 0) 
          : (a.totalPrice || 0) - (b.totalPrice || 0);
      });
    } else if (this.selectedTimeSort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    } else if (this.selectedTimeSort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    }

    this.orders = filtered;
    this.calculatePages();
  }

  get paginatedOrders() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.orders.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get visiblePages() {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  calculatePages() {
    this.totalPages = Math.ceil(this.orders.length / this.itemsPerPage) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
  }

  setPage(p: number) { if (p > 0 && p <= this.totalPages) this.currentPage = p; }

  getStatusColor(status: string): string {
    const allOpts = [...this.deliveryStatusOptions, ...this.paymentStatusOptions];
    const option = allOpts.find(opt => opt.value === status);
    return option ? option.color : '#f3a5b9';
  }

  toggleSelectAll(event: any) {
    if (event.target.checked) this.paginatedOrders.forEach(o => this.selectedIds.add(o.id));
    else this.selectedIds.clear();
  }

  toggleSelect(id: string) {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  startEdit(order: any) {
  this.editingId = order.id;
  this.editData = JSON.parse(JSON.stringify(order));
  // Lấy paymentStatus từ paymentId
  if (order.paymentId) {
    this.editData.paymentStatus = order.paymentId.paymentStatus;
  } else {
    this.editData.paymentStatus = 'Chưa thanh toán';
  }
  if (!this.editData.shippingAddress) {
    this.editData.shippingAddress = { fullName: order.customerName || '' };
  }
}

  saveInlineEdit() {
    if (!this.editingId) return;
    this.http.put(`${this.apiUrl}/${this.editingId}`, this.editData).subscribe({
      next: () => {
        this.toastr.success('Cập nhật thành công!');
        this.editingId = null;
        this.loadOrders();
      },
      error: () => this.toastr.error('Lỗi khi lưu dữ liệu!')
    });
  }

  async deleteBulk() {
    if (this.selectedIds.size === 0) return;
    if (confirm(`Xác nhận xóa ${this.selectedIds.size} đơn hàng?`)) {
      const idsArray = Array.from(this.selectedIds);
      for (const id of idsArray) await this.http.delete(`${this.apiUrl}/${id}`).toPromise();
      this.toastr.success('Xóa thành công!');
      this.selectedIds.clear();
      this.loadOrders();
    }
  }

  deleteOrder(id: string) {
    if(confirm("Xác nhận xóa đơn hàng?")) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
        this.toastr.success('Xóa thành công!');
        this.loadOrders();
      });
    }
  }

  exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(this.allOrders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, 'Muse_Orders.xlsx');
  }

  importExcel(evt: any) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      this.http.post(`${this.apiUrl}/import`, data).subscribe(() => {
        this.toastr.success('Nhập thành công!');
        this.loadOrders();
      });
    };
    reader.readAsBinaryString(evt.target.files[0]);
  }
}