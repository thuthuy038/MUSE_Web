import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-oauth-redirect',
  template: '<p>Đang xử lý đăng nhập...</p>',
  standalone: true
})
export class OAuthRedirect implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        // Lưu token tạm thời
        sessionStorage.setItem('currentUser', JSON.stringify({ token }));
        (this.userService as any).currentUserSubject.next({ token });

        // Gọi API lấy thông tin user
        this.userService.getProfile().subscribe({
          next: (user) => {
            // Lưu user đầy đủ
            sessionStorage.setItem('currentUser', JSON.stringify({ ...user, token }));
            (this.userService as any).currentUserSubject.next({ ...user, token });
            this.router.navigate(['/']);
          },
          error: () => {
            sessionStorage.removeItem('currentUser');
            (this.userService as any).currentUserSubject.next(null);
            this.router.navigate(['/login']);
          }
        });
      } else {
        this.router.navigate(['/login']);
      }
    });
  }
}