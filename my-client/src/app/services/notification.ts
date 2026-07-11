// services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, switchMap } from 'rxjs';

export interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'order' | 'review' | 'stock' | 'promotion' | 'system';
    status: 'unread' | 'read';
    targetId: string | null;
    createdAt: string;
    readAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private apiUrl = 'https://server-testing-ymn9.onrender.com/api/notifications';
    private notificationsSubject = new BehaviorSubject<Notification[]>([]);
    private unreadCountSubject = new BehaviorSubject<number>(0);

    public notifications$ = this.notificationsSubject.asObservable();
    public unreadCount$ = this.unreadCountSubject.asObservable();

    private pollingInterval: any;

    constructor(private http: HttpClient) { }

    startPolling(intervalMs: number = 30000) {
        // Polling mỗi 30 giây
        this.pollingInterval = interval(intervalMs).pipe(
            switchMap(() => this.getNotifications())
        ).subscribe({
            next: (res) => {
                this.notificationsSubject.next(res.data);
                this.unreadCountSubject.next(res.unreadCount);
            },
            error: (err) => console.error('Lỗi polling notification:', err)
        });

        // Gọi ngay lập tức
        this.refresh();
    }

    stopPolling() {
        if (this.pollingInterval) {
            this.pollingInterval.unsubscribe();
        }
    }

    refresh() {
        this.getNotifications().subscribe({
            next: (res) => {
                this.notificationsSubject.next(res.data);
                this.unreadCountSubject.next(res.unreadCount);
            },
            error: (err) => console.error('Lỗi lấy notification:', err)
        });
    }

    getNotifications(): Observable<{ data: Notification[]; unreadCount: number; total: number }> {
        return this.http.get<any>(this.apiUrl);
    }

    markAsRead(id: string): Observable<Notification> {
        return this.http.put<Notification>(`${this.apiUrl}/${id}/read`, {});
    }

    markAllAsRead(): Observable<any> {
        return this.http.put(`${this.apiUrl}/read-all`, {});
    }

    deleteNotification(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
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
}