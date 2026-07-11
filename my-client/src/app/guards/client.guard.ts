import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from '../services/user';


@Injectable({ providedIn: 'root' })
export class ClientGuard implements CanActivate {
    constructor(private userService: UserService, private router: Router) { }

    canActivate(): boolean {
        const user = this.userService.currentUserValue;
        if (user && user.role === 'customer') {
            return true;
        }
        // Nếu đã đăng nhập nhưng là admin, chuyển sang admin account
        if (user && user.role === 'admin') {
            this.router.navigate(['/admin/account']);
            return false;
        }
        // Chưa đăng nhập
        this.router.navigate(['/login']);
        return false;
    }
}