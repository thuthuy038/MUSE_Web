import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user';
import { LocationService } from '../../services/location'; 
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-change-address',
  templateUrl: './change-address.html',
  styleUrls: ['./change-address.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule]
})
export class ChangeAddress implements OnInit {

  fullName = '';
  phone = '';
  street = '';
  type = 'nha_rieng';
  isDefault = false;

  selectedProvince: any = null;
  selectedDistrict: any = null;
  selectedWard: any = null;

  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];

  currentUser: any = null;
  avatarSrc: string = 'assets/images/account/Generic_avatar.png'; 

  constructor(
    private userService: UserService,
    private locationService: LocationService, 
    private router: Router
  ) {}

  ngOnInit() {
    // Lấy thông tin user hiện tại
    this.userService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user?.avatar) {
        // Xử lý avatar có thể là string hoặc object
        this.avatarSrc = typeof user.avatar === 'string' 
          ? user.avatar 
          : (user.avatar?.url || 'assets/images/account/Generic_avatar.png');
      } else {
        this.avatarSrc = 'assets/images/account/Generic_avatar.png';
      }
    });

    // Lấy dữ liệu tỉnh/thành từ LocationService
    this.locationService.provinces$.subscribe(data => {
      this.provinces = data;
    });
  }

  // Khi chọn tỉnh/thành phố
  onProvinceChange() {
    this.selectedDistrict = null;
    this.selectedWard = null;
    this.districts = [];
    this.wards = [];

    if (this.selectedProvince) {
      // Gọi service để tải quận/huyện theo mã tỉnh
      this.locationService.loadDistricts(this.selectedProvince.code);

      // Lắng nghe dữ liệu quận/huyện từ service
      this.locationService.districts$.subscribe(data => {
        this.districts = data;
      });
    }
  }

  // Khi chọn quận/huyện
  onDistrictChange() {
    this.selectedWard = null;
    this.wards = [];

    if (this.selectedDistrict) {
      // Gọi service để tải phường/xã theo mã quận
      this.locationService.loadWards(this.selectedDistrict.code);

      // Lắng nghe dữ liệu phường/xã từ service
      this.locationService.wards$.subscribe(data => {
        this.wards = data;
      });
    }
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/login']);
  }

  // Thêm địa chỉ mới
  addAddress() {
    if (!this.fullName || !this.phone || !this.selectedProvince || !this.selectedDistrict || !this.selectedWard || !this.street) {
      alert('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (!this.currentUser) {
      alert('Bạn chưa đăng nhập');
      return;
    }

    const addressData = {
      fullName: this.fullName,
      phone: this.phone,
      street: this.street,
      ward: this.selectedWard.name,
      district: this.selectedDistrict.name,
      province: this.selectedProvince.name,
      type: this.type,
      isDefault: this.isDefault
    };

    this.userService.addAddress(this.currentUser._id, addressData).subscribe({
      next: (res) => {
        alert('Thêm địa chỉ thành công!');
        this.fullName = '';
        this.phone = '';
        this.street = '';
        this.selectedProvince = null;
        this.selectedDistrict = null;
        this.selectedWard = null;
        this.type = 'nha_rieng';
        this.isDefault = false;
      },
      error: (err) => {
        console.error('Lỗi thêm địa chỉ:', err);
        alert('Có lỗi xảy ra, vui lòng thử lại');
      }
    });
  }
}