import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { CartService, CartTotals } from '../../services/cart';
import { District, LocationService, Province, Ward } from '../../services/location';
import { of, startWith, switchMap, tap, take, Subscription, Observable, firstValueFrom } from 'rxjs';
import { ICartItem } from '../../interfaces/cartitem';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../../services/user';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-check-out',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CurrencyPipe, RouterLink],
  templateUrl: './check-out.html',
  styleUrl: './check-out.css',
})
export class CheckOut implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private locationService = inject(LocationService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private currentUserId = this.authService.getUserId();

  cartItems$: Observable<ICartItem[]>;
  totals$: Observable<CartTotals>;
  checkoutForm: FormGroup;

  private currentCartItems: ICartItem[] = [];
  private currentTotals: CartTotals | null = null;
  private totalsSubscription: Subscription | undefined;

  provinces$: Observable<Province[]>;
  districts$: Observable<District[]>;
  wards$: Observable<Ward[]>;

  isQrModalVisible = false;
  isValidationModalVisible = false;
  isSuccessModalVisible = false;

  qrImageUrl = '';
  currentOrderId = '';
  validationErrors: string[] = [];

  userAddresses: any[] = [];
  addressChoiceControl = new FormControl('default');
  addressIdControl = new FormControl('');

  constructor() {
    this.totals$ = this.cartService.totals$.pipe(
      tap(totals => this.currentTotals = totals)
    );

    this.cartItems$ = this.cartService.processedSelectedItems$.pipe(
      tap(items => this.currentCartItems = items)
    );

    this.checkoutForm = this.fb.group({
      email: ['', Validators.email],
      name: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      province: ['', Validators.required],
      district: ['', Validators.required],
      ward: ['', Validators.required],
      note: [''],
      shipping: ['standard', Validators.required],
      payment: ['COD', Validators.required]
    });

    this.provinces$ = this.locationService.getProvinces();

    this.districts$ = this.checkoutForm.get('province')!.valueChanges.pipe(
      startWith(null),
      switchMap(provinceCode => {
        if (provinceCode) {
          this.checkoutForm.get('district')?.reset('');
          this.checkoutForm.get('ward')?.reset('');
          return this.locationService.getDistricts(provinceCode);
        }
        return of([] as District[]);
      })
    );

    this.wards$ = this.checkoutForm.get('district')!.valueChanges.pipe(
      startWith(null),
      switchMap(districtCode => {
        if (districtCode) {
          this.checkoutForm.get('ward')?.reset('');
          return this.locationService.getWards(districtCode);
        }
        return of([] as Ward[]);
      })
    );



    // Chỉ thiết lập các subscription liên quan địa chỉ nếu user đã đăng nhập
    if (this.authService.isLoggedIn()) {
      this.addressChoiceControl.valueChanges.subscribe(choice => {
        if (choice === 'default') {
          const defaultAddr = this.userAddresses.find(a => a.isDefault) || this.userAddresses[0];
          if (defaultAddr) this.fillAddressForm(defaultAddr);
        } else if (choice === 'other' && this.addressIdControl.value) {
          const selectedAddr = this.userAddresses.find(a => a._id === this.addressIdControl.value || a.id === this.addressIdControl.value);
          if (selectedAddr) this.fillAddressForm(selectedAddr);
        }
      });

      this.addressIdControl.valueChanges.subscribe(addressId => {
        if (addressId && this.addressChoiceControl.value === 'other') {
          const selectedAddr = this.userAddresses.find(a => a._id === addressId || a.id === addressId);
          if (selectedAddr) this.fillAddressForm(selectedAddr);
        }
      });
    }
  }

  ngOnInit(): void {
    this.totalsSubscription = this.totals$.subscribe(totals => {
      this.currentTotals = totals;
    });

    this.cartItems$.pipe(take(1)).subscribe(items => {
      if (items.length === 0) {
        this.router.navigate(['/cart']);
      } else if (this.authService.isLoggedIn()) {
        // Nếu đã đăng nhập thì load thông tin user (địa chỉ, email, tên...)
        this.loadUserInfo();
      }
      // Nếu chưa đăng nhập, không load user info, form để trống cho khách nhập
    });
  }

  ngOnDestroy(): void {
    if (this.totalsSubscription) this.totalsSubscription.unsubscribe();
  }

  private loadUserInfo(): void {
    if (!this.currentUserId) return;
    this.http.get<any>(`http://localhost:3000/api/users/${this.currentUserId}`).subscribe({
      next: async (user) => {
        console.log('User data:', user);
        this.checkoutForm.patchValue({
          email: user.email || '',
          name: user.name || '',
          phone: user.phone || ''
        });

        this.userAddresses = user.addresses || [];
        if (this.userAddresses.length > 0) {
          const defaultAddr = this.userAddresses.find(a => a.isDefault) || this.userAddresses[0];
          await this.fillAddressForm(defaultAddr);
        }
      },
      error: (err) => console.error('Không thể tải thông tin user:', err)
    });
  }

  private async fillAddressForm(addr: any): Promise<void> {
    this.checkoutForm.patchValue({
      name: addr.fullName || this.checkoutForm.value.name,
      phone: addr.phone || this.checkoutForm.value.phone,
      address: addr.street || ''
    });
    if (addr.province && addr.district && addr.ward) {
      await this.selectLocationByNames(addr.province, addr.district, addr.ward);
    }
  }

  private normalizeName(name: string): string {
    if (!name) return '';
    return name.replace(/^(Tỉnh|Thành phố|Quận|Huyện|Thị xã|Phường|Xã)\s+/i, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private async selectLocationByNames(provinceName: string, districtName: string, wardName: string): Promise<void> {
    try {
      const provinces = await firstValueFrom(this.locationService.getProvinces());
      const normalizedProvince = this.normalizeName(provinceName);
      const province = provinces.find(p => this.normalizeName(p.name) === normalizedProvince);
      if (!province) return;

      this.checkoutForm.patchValue({ province: province.code });
      const districts = await firstValueFrom(this.locationService.fetchDistricts(province.code));
      const normalizedDistrict = this.normalizeName(districtName);
      const district = districts.find(d => this.normalizeName(d.name) === normalizedDistrict);
      if (!district) return;

      this.checkoutForm.patchValue({ district: district.code });
      const wards = await firstValueFrom(this.locationService.fetchWards(district.code));
      const normalizedWard = this.normalizeName(wardName);
      const ward = wards.find(w => this.normalizeName(w.name) === normalizedWard);
      if (ward) this.checkoutForm.patchValue({ ward: ward.code });
    } catch (error) {
      console.error('Error syncing address:', error);
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.checkoutForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private getFormValidationErrors(): string[] {
    const errors: string[] = [];
    const controls = this.checkoutForm.controls;
    if (controls['email'].invalid) errors.push('Email không hợp lệ.');
    if (controls['name'].invalid) errors.push('Họ và tên không được để trống.');
    if (controls['phone'].invalid) errors.push('Số điện thoại không được để trống.');
    if (controls['address'].invalid) errors.push('Địa chỉ không được để trống.');
    if (controls['province'].invalid) errors.push('Vui lòng chọn Tỉnh/TP.');
    if (controls['district'].invalid) errors.push('Vui lòng chọn Quận/Huyện.');
    if (controls['ward'].invalid) errors.push('Vui lòng chọn Phường/Xã.');
    return errors;
  }

  handlePlaceOrder(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.validationErrors = this.getFormValidationErrors();
      this.isValidationModalVisible = true;
      return;
    }
    if (!this.currentTotals) return;

    const formValue = this.checkoutForm.value;
    const provinceText = (document.getElementById('tinh-tp') as HTMLSelectElement).selectedOptions[0]?.text || '';
    const districtText = (document.getElementById('quan-huyen') as HTMLSelectElement).selectedOptions[0]?.text || '';
    const wardText = (document.getElementById('phuong-xa') as HTMLSelectElement).selectedOptions[0]?.text || '';

    const shippingFee = this.currentTotals.shippingFee === 0 ? 0 : (formValue.shipping === 'standard' ? 23000 : 40000);
    const finalTotal = this.currentTotals.selectedSubtotal - this.currentTotals.discountAmount + shippingFee;

    const orderPayload = {
      userId: this.currentUserId,
      customerName: formValue.name,
      shippingAddress: {
        fullName: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
        address: formValue.address,
        city: provinceText,
        district: districtText,
        ward: wardText
      },
      items: this.currentCartItems.map(item => ({
        productId: item.id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        price: item.finalPrice,
        size: item.size,
        color: item.color
      })),
      shippingMethod: {
        name: formValue.shipping === 'standard' ? "Giao hàng tiêu chuẩn" : "Giao hàng hoả tốc",
        fee: shippingFee
      },
      paymentMethod: formValue.payment,
      paymentStatus: formValue.payment === 'COD' ? 'Chưa thanh toán' : 'Đã thanh toán',
      subTotal: this.currentTotals.selectedSubtotal,
      totalPrice: finalTotal,
      promotion: { discountAmount: this.currentTotals.discountAmount },
      note: formValue.note,
      status: 'Đang xử lý'
    };

    this.http.post('http://localhost:3000/api/orders', orderPayload).subscribe({
      next: (res: any) => {
        this.currentOrderId = res.id || res._id;
        if (formValue.payment === 'COD') {
          this.isSuccessModalVisible = true;
        } else {
          const qrData = `Thanh toan don hang ${this.currentOrderId}. So tien: ${finalTotal} VND`;
          this.qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
          this.isQrModalVisible = true;
        }
      },
      error: (err) => alert("Lỗi khi đặt hàng: " + err.message)
    });
  }

  handleQrClose(): void {
    this.isQrModalVisible = false;
    this.isSuccessModalVisible = true;
  }

  handleSuccessModalClose(): void {
    this.isSuccessModalVisible = false;
    this.cartService.removePaidItems();
    this.router.navigate(['/']);
  }
}