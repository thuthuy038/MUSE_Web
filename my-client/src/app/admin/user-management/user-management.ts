import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IUser } from '../../interfaces/user';
import { UserService } from '../../services/user';
import { RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit {
  users: IUser[] = [];
  displayUsers: IUser[] = [];

  sortField: string = '';
  sortDirection: number = 1;

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  pages: number[] = [];

  searchKeyword = '';
  statusFilter = 'all';

  selectedUserIds: Set<string> = new Set();
  bulkAction: string = '';

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getCustomers().subscribe({
      next: (data: IUser[]) => {
        this.users = data;
        this.applyFilters();
      },
      error: (err: any) => {
        console.error("Lỗi lấy users:", err);
      }
    });
  }

  //  TÌM KIẾM ĐƠN GIẢN - CHỈ THEO TÊN
  searchUsers() {
    this.applyFilters();
  }

  filterByStatus() {
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.users];

    //  TÌM KIẾM ĐƠN GIẢN: CHỈ THEO TÊN
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(keyword)
      );
    }

    // Lọc theo trạng thái
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === this.statusFilter);
    }

    // Sắp xếp
    if (this.sortField) {
      filtered.sort((a, b) => {
        const valA = a[this.sortField as keyof IUser];
        const valB = b[this.sortField as keyof IUser];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA > valB) return this.sortDirection;
        if (valA < valB) return -this.sortDirection;
        return 0;
      });
    }

    this.updatePagination(filtered);
  }

  // Sắp xếp
  sort(field: string) {
    if (this.sortField === field) {
      this.sortDirection = -this.sortDirection;
    } else {
      this.sortField = field;
      this.sortDirection = 1;
    }
    this.applyFilters();
  }

  updatePagination(filteredUsers: IUser[]) {
    this.totalPages = Math.ceil(filteredUsers.length / this.pageSize);
    this.currentPage = 1;
    this.changePage(1, filteredUsers);
    this.updateVisiblePages();
  }

  changePage(page: number, filteredUsers: IUser[] = this.users) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayUsers = filteredUsers.slice(start, end);
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

  // ========== CHỌN HÀNG LOẠT ==========
  isAllSelected(): boolean {
    return this.displayUsers.length > 0 &&
      this.displayUsers.every(user => this.selectedUserIds.has(user._id));
  }

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.displayUsers.forEach(user => this.selectedUserIds.add(user._id));
    } else {
      this.selectedUserIds.clear();
    }
  }

  toggleSelect(userId: string, event: any) {
    if (event.target.checked) {
      this.selectedUserIds.add(userId);
    } else {
      this.selectedUserIds.delete(userId);
    }
  }

  hasSelected(): boolean {
    return this.selectedUserIds.size > 0;
  }

  getSelectedCount(): number {
    return this.selectedUserIds.size;
  }

  // ========== XUẤT EXCEL ==========
  exportToExcel() {
    const selectedUsers = this.users.filter(u => this.selectedUserIds.has(u._id));
    const dataToExport = selectedUsers.length > 0 ? selectedUsers : this.users;

    const exportData = dataToExport.map(user => ({
      'Mã khách hàng': user.code,
      'Họ tên': user.name,
      'Email': user.email,
      'Số điện thoại': user.phone || '',
      'Trạng thái': user.status === 'active' ? 'Hoạt động' : 'Đã khóa',
      'Ngày tạo': new Date(user.createdAt).toLocaleDateString('vi-VN')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KhachHang');
    XLSX.writeFile(wb, `Muse_KhachHang_${new Date().toISOString().split('T')[0]}.xlsx`);

    alert(`Đã xuất ${exportData.length} khách hàng thành công!`);
  }

  // ========== XÓA HÀNG LOẠT ==========
  async deleteBulk() {
    if (this.selectedUserIds.size === 0) {
      alert('Vui lòng chọn ít nhất một khách hàng');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${this.selectedUserIds.size} khách hàng?`)) {
      const ids = Array.from(this.selectedUserIds);
      let successCount = 0;

      for (const id of ids) {
        try {
          await this.userService.deleteUser(id).toPromise();
          successCount++;
        } catch (err) {
          console.error(`Xóa user ${id} thất bại:`, err);
        }
      }

      alert(`Đã xóa thành công ${successCount}/${ids.length} khách hàng`);
      this.selectedUserIds.clear();
      this.loadUsers();
    }
  }

  // ========== KHÓA/KÍCH HOẠT HÀNG LOẠT ==========
  lockBulk() {
    if (this.selectedUserIds.size === 0) {
      alert('Vui lòng chọn ít nhất một khách hàng');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn khóa ${this.selectedUserIds.size} tài khoản?`)) {
      this.updateBulkStatus('inactive');
    }
  }

  activateBulk() {
    if (this.selectedUserIds.size === 0) {
      alert('Vui lòng chọn ít nhất một khách hàng');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn kích hoạt ${this.selectedUserIds.size} tài khoản?`)) {
      this.updateBulkStatus('active');
    }
  }

  private updateBulkStatus(status: 'active' | 'inactive') {
    const ids = Array.from(this.selectedUserIds);
    let successCount = 0;

    ids.forEach(id => {
      this.userService.updateUser(id, { status }).subscribe({
        next: () => successCount++,
        error: (err) => console.error(`Cập nhật user ${id} thất bại:`, err)
      });
    });

    setTimeout(() => {
      alert(`Đã ${status === 'active' ? 'kích hoạt' : 'khóa'} thành công ${successCount}/${ids.length} tài khoản`);
      this.selectedUserIds.clear();
      this.loadUsers();
    }, 500);
  }

  // Thực thi hành động
  executeBulkAction() {
    if (!this.bulkAction) {
      alert('Vui lòng chọn hành động');
      return;
    }

    if (this.selectedUserIds.size === 0) {
      alert('Vui lòng chọn ít nhất một khách hàng');
      return;
    }

    switch (this.bulkAction) {
      case 'export':
        this.exportToExcel();
        break;
      case 'delete':
        this.deleteBulk();
        break;
      case 'lock':
        this.lockBulk();
        break;
      case 'activate':
        this.activateBulk();
        break;
      default:
        alert('Hành động không hợp lệ');
    }
  }

  // Xóa một user
  deleteUser(id: string) {
    if (!confirm("Bạn có chắc muốn xóa user này?")) return;

    this.userService.deleteUser(id).subscribe({
      next: () => {
        alert("Xóa user thành công");
        this.loadUsers();
      },
      error: (err: any) => {
        console.error("Lỗi xóa user:", err);
        alert("Xóa user thất bại");
      }
    });
  }

  // Helper
  getGenderText(gender?: string): string {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'other': return 'Khác';
      default: return 'Chưa cập nhật';
    }
  }
}