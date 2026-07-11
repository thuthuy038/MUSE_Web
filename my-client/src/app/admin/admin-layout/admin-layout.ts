import { Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdSidebar } from "../ad-sidebar/ad-sidebar";
import { CommonModule } from '@angular/common';
import { AdHeaderComponent } from '../ad-header/ad-header';

@Component({
  selector: 'app-admin-layout',
  imports: [AdSidebar, RouterModule, CommonModule, AdHeaderComponent],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css'],
})
export class AdminLayout {
  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (window.innerWidth > 768) {
      this.isSidebarOpen = false;
    }
  }
}