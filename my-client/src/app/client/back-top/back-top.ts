import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-back-top',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './back-top.html',
  styleUrl: './back-top.css',
})
export class BackTop {
  show = false;

  // Lắng nghe scroll của window
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.show = window.scrollY > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
