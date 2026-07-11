import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from './client/header/header';
import { Footer } from './client/footer/footer';
import { ChatWidget } from './client/chat-widget/chat-widget';
import { WelcomePopup } from './client/welcome-popup/welcome-popup';
import { BackTop } from './client/back-top/back-top';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, Header, Footer, ChatWidget, WelcomePopup, BackTop],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-client');
  
  constructor(public router: Router) {}
}
