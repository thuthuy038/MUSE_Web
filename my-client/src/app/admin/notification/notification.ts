import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, Notification } from '../../services/notification';
import { Injectable } from '@angular/core';

@Component({
    selector: 'app-notification',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './notification.html',
    styleUrls: ['./notification.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
    notifications: Notification[] = [];
    unreadCount = 0;
    showDropdown = false;
    loading = false;

    constructor(private notificationService: NotificationService) {}

    ngOnInit() {
        this.notificationService.notifications$.subscribe(data => {
            this.notifications = data;
        });
        
        this.notificationService.unreadCount$.subscribe(count => {
            this.unreadCount = count;
        });
        
        this.notificationService.startPolling(30000);
    }

    ngOnDestroy() {
        this.notificationService.stopPolling();
    }

    toggleDropdown() {
        this.showDropdown = !this.showDropdown;
        if (this.showDropdown) {
            this.notificationService.refresh();
        }
    }

    markAsRead(notification: Notification, event: Event) {
        event.stopPropagation();
        if (notification.status === 'unread') {
            this.notificationService.markAsRead(notification._id).subscribe(() => {
                notification.status = 'read';
                this.notificationService.refresh();
            });
        }
    }

    markAllAsRead() {
        this.notificationService.markAllAsRead().subscribe(() => {
            this.notificationService.refresh();
        });
    }

    deleteNotification(id: string, event: Event) {
        event.stopPropagation();
        if (confirm('Xóa thông báo này?')) {
            this.notificationService.deleteNotification(id).subscribe(() => {
                this.notificationService.refresh();
            });
        }
    }

    getTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return `${diffDays} ngày trước`;
    }

    getIconByType(type: string): string {
        switch (type) {
            case 'order': return 'bi-cart';
            case 'review': return 'bi-star';
            case 'stock': return 'bi-box';
            case 'promotion': return 'bi-tag';
            default: return 'bi-bell';
        }
    }

    getColorByType(type: string): string {
        switch (type) {
            case 'order': return '#28a745';
            case 'review': return '#ffc107';
            case 'stock': return '#dc3545';
            case 'promotion': return '#17a2b8';
            default: return '#6c757d';
        }
    }

    navigateToTarget(notification: Notification) {
        if (notification.targetId) {
            switch (notification.type) {
                case 'order':
                    window.location.href = `/admin/order-edit/${notification.targetId}`;
                    break;
                case 'review':
                    window.location.href = `/admin/review-edit/${notification.targetId}`;
                    break;
                case 'stock':
                    window.location.href = `/admin/product-edit/${notification.targetId}`;
                    break;
                case 'promotion':
                    window.location.href = `/admin/promotion-edit/${notification.targetId}`;
                    break;
            }
        }
        this.showDropdown = false;
    }
}