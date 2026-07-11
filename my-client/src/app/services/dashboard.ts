import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Overview {
    orders: { total: number; today: number; month: number };
    revenue: { total: number; today: number; month: number };
    products: { total: number; outOfStock: number; lowStock: number };
    users: { total: number; newThisMonth: number };
    reviews: { total: number; averageRating: number };
}

export interface RevenueData {
    date: string;
    revenue: number;
    orders: number;
}

export interface TopProduct {
    _id: string;
    name: string;
    totalSold: number;
    revenue: number;
    code: string;
    image: string | null;
}

export interface RecentOrder {
    id: string;
    customerName: string;
    totalPrice: number;
    status: string;
    createdAt: string;
}

export interface RecentReview {
    _id: string;
    customerName: string;
    productName: string;
    productImage: string | null;
    rating: number;
    content: string;
    createdAt: string;
}

export interface AlertProduct {
    _id: string;
    name: string;
    code: string;
    stock: number;
    image: string | null;
}

export interface AlertPromotion {
    _id: string;
    name: string;
    code: string;
    endDate: string;
}

export interface Alert {
    lowStock: AlertProduct[];
    outOfStock: AlertProduct[];
    expiringPromotions: AlertPromotion[];
    pendingOrders: number;
    pendingReviews: number;
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private apiUrl = 'http://localhost:3000/api/dashboard';

    constructor(private http: HttpClient) { }

    getOverview(): Observable<Overview> {
        return this.http.get<Overview>(`${this.apiUrl}/overview`);
    }

    getRevenueChart(): Observable<RevenueData[]> {
        return this.http.get<RevenueData[]>(`${this.apiUrl}/revenue-chart`);
    }

    getTopProducts(limit: number = 5): Observable<TopProduct[]> {
        return this.http.get<TopProduct[]>(`${this.apiUrl}/top-products?limit=${limit}`);
    }

    getRecentOrders(): Observable<RecentOrder[]> {
        return this.http.get<RecentOrder[]>(`${this.apiUrl}/recent-orders`);
    }

    getRecentReviews(): Observable<RecentReview[]> {
        return this.http.get<RecentReview[]>(`${this.apiUrl}/recent-reviews`);
    }

    getAlerts(): Observable<Alert> {
        return this.http.get<Alert>(`${this.apiUrl}/alerts`);
    }
}