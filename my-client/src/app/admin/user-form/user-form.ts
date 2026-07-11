import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user';
import { LocationService } from '../../services/location';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.css'],
})
export class UserForm implements OnInit {
  form: FormGroup;
  avatarPreview: any = null;
  showPreview = false;

  // Biến cho form thêm địa chỉ
  showAddressForm = false;
  selectedProvince: any = null;
  selectedDistrict: any = null;
  selectedWard: any = null;
  street: string = '';
  fullName: string = '';
  phone: string = '';
  addressType: string = 'nha_rieng';
  isDefault: boolean = false;
  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private locationService: LocationService
  ) {
    this.form = this.fb.group({
      code: [''],
      name: [''],
      gender: [''],
      birthday: [''],
      age: [''],
      email: [''],
      phone: [''],
      address: [''], // địa chỉ chính (hiển thị địa chỉ mặc định)
      addresses: this.fb.array([]), // mảng địa chỉ giao hàng
      createdAt: [''],
      status: ['active'],
      role: ['customer'],
      avatar: ['']
    });
  }

  ngOnInit() {
    this.loadUser();
    this.loadProvinces();
  }

  // ===== Location =====
  loadProvinces() {
    this.locationService.getProvinces().subscribe({
      next: (data) => this.provinces = data,
      error: (err) => console.error('Lỗi tải tỉnh:', err)
    });
  }

  onProvinceChange() {
    this.selectedDistrict = null;
    this.selectedWard = null;
    this.districts = [];
    this.wards = [];
    if (this.selectedProvince) {
      this.locationService.getDistricts(this.selectedProvince.code).subscribe({
        next: (data) => this.districts = data,
        error: (err) => console.error('Lỗi tải quận:', err)
      });
    }
  }

  onDistrictChange() {
    this.selectedWard = null;
    this.wards = [];
    if (this.selectedDistrict) {
      this.locationService.getWards(this.selectedDistrict.code).subscribe({
        next: (data) => this.wards = data,
        error: (err) => console.error('Lỗi tải phường:', err)
      });
    }
  }

  // ===== Address form =====
  toggleAddressForm() {
    this.showAddressForm = !this.showAddressForm;
    if (this.showAddressForm) {
      this.resetAddressForm();
    }
  }

  resetAddressForm() {
    this.selectedProvince = null;
    this.selectedDistrict = null;
    this.selectedWard = null;
    this.street = '';
    this.fullName = '';
    this.phone = '';
    this.addressType = 'nha_rieng';
    this.isDefault = false;
    this.districts = [];
    this.wards = [];
  }

  cancelAddressForm() {
    this.showAddressForm = false;
  }

  addAddressFromForm() {
    if (!this.selectedProvince || !this.selectedDistrict || !this.selectedWard || !this.street.trim() || !this.fullName.trim() || !this.phone.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin địa chỉ');
      return;
    }

    const newAddress = {
      fullName: this.fullName.trim(),
      phone: this.phone.trim(),
      province: this.selectedProvince.name,
      district: this.selectedDistrict.name,
      ward: this.selectedWard.name,
      street: this.street.trim(),
      type: this.addressType,
      isDefault: this.isDefault
    };

    // Nếu địa chỉ mới là mặc định, reset các địa chỉ khác
    if (this.isDefault) {
      this.addresses.controls.forEach((control: any) => {
        control.patchValue({ isDefault: false });
      });
    }

    this.addresses.push(this.fb.control(newAddress));
    this.showAddressForm = false;
    this.resetAddressForm();
    this.updateDefaultAddressDisplay(); // Cập nhật ô địa chỉ chính
  }

  // ===== User data =====
  loadUser() {
  const id = this.route.snapshot.paramMap.get('id');
  if (!id) return;

  // Nếu id bắt đầu bằng CUS- hoặc AD- (code), gọi API tìm theo code
  if (id.startsWith('CUS-') || id.startsWith('AD-')) {
    this.userService.getUserByCode(id).subscribe({
      next: (user) => this.populateForm(user),
      error: (err) => console.error('Không tìm thấy user theo code', err)
    });
  } else {
    // Ngược lại, tìm theo _id
    this.userService.getUserById(id).subscribe({
      next: (user) => this.populateForm(user),
      error: (err) => console.error(err)
    });
  }
}

// Tách riêng hàm populate để dùng chung
populateForm(user: any) {
  this.form.patchValue({
    code: user.code,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthday: user.birthday ? user.birthday.substring(0, 10) : '',
    status: user.status,
    role: user.role,
    createdAt: user.createdAt ? user.createdAt.substring(0, 10) : ''
  });

  if (user.avatar) {
    this.avatarPreview = `http://localhost:3000${user.avatar.url}`;
  }

  this.addresses.clear();
  if (user.addresses && Array.isArray(user.addresses)) {
    user.addresses.forEach((addr: any) => {
      this.addresses.push(this.fb.control(addr));
    });
  }

  this.updateDefaultAddressDisplay();
}

  get addresses(): FormArray {
    return this.form.get('addresses') as FormArray;
  }

  removeAddress(index: number) {
    this.addresses.removeAt(index);
    this.updateDefaultAddressDisplay(); // Cập nhật lại địa chỉ chính sau khi xóa
  }

  getAddressDisplay(addr: any): string {
    return `${addr.street}, ${addr.ward}, ${addr.district}, ${addr.province}`;
  }

  // Cập nhật ô "Địa chỉ chính" với địa chỉ mặc định (nếu có)
  updateDefaultAddressDisplay() {
    const addressesArray = this.addresses.value;
    const defaultAddr = addressesArray.find((addr: any) => addr.isDefault);
    if (defaultAddr) {
      this.form.patchValue({ address: this.getAddressDisplay(defaultAddr) });
    } else {
      this.form.patchValue({ address: '' });
    }
  }

  // ===== Avatar =====
  onAvatarChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);
    const id = this.route.snapshot.paramMap.get('id');

    fetch(`http://localhost:3000/api/users/${id}/avatar`, {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(user => {
        if (user.avatar) {
          this.avatarPreview = `http://localhost:3000${user.avatar.url}`;
        }
      });
  }

  openPreview() {
    this.showPreview = true;
  }

  closePreview() {
    this.showPreview = false;
  }

  removeAvatar() {
    this.avatarPreview = null;
    this.form.patchValue({ avatar: null });
  }

  // ===== Age calculation =====
  calculateAge() {
    const birthday = this.form.value.birthday;
    if (!birthday) return;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.form.patchValue({ age: age });
  }

  // ===== Save =====
  save() {
    const id = this.route.snapshot.paramMap.get('id');
    const { age, createdAt, ...data } = this.form.value;

    if (id) {
      this.userService.updateUser(id, data).subscribe({
        next: () => {
          alert("Cập nhật người dùng thành công");
          this.router.navigate(['/admin/user-management']);
        },
        error: (err) => console.error(err)
      });
    } else {
      this.userService.createUser(data).subscribe({
        next: () => {
          alert("Thêm người dùng thành công");
          this.router.navigate(['/admin/user-management']);
        },
        error: (err) => console.error(err)
      });
    }
  }

  cancel() {
    if (confirm("Bạn có chắc muốn hủy thay đổi?")) {
      this.router.navigate(['/admin/user-management']);
    }
  }
}