import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from '../services/user';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  canActivate(): boolean {
    const user = this.userService.currentUserValue;
    if (user && user.role === 'admin') {
      return true;
    }
    this.router.navigate(['/admin/login']);
    return false;
  }
}