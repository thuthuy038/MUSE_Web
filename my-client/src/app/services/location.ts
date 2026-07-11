import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

export interface Province {
  name: string;
  code: number;
}
export interface District {
  name: string;
  code: number;
}
export interface Ward {
  name: string;
  code: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private http = inject(HttpClient);
  private API_HOST = "https://server-testing-ymn9.onrender.com/api/location";

  private provincesSubject = new BehaviorSubject<Province[]>([]);
  private districtsSubject = new BehaviorSubject<District[]>([]);
  private wardsSubject = new BehaviorSubject<Ward[]>([]);

  public provinces$ = this.provincesSubject.asObservable();
  public districts$ = this.districtsSubject.asObservable();
  public wards$ = this.wardsSubject.asObservable();

  constructor() {
    this.loadProvinces();
  }

  loadProvinces() {
    this.http.get<Province[]>(`${this.API_HOST}/provinces`)
      .subscribe(data => this.provincesSubject.next(data));
  }

  loadDistricts(provinceCode: number | string) {
    this.http.get<District[]>(`${this.API_HOST}/districts/${provinceCode}`)
      .subscribe(data => {
        this.districtsSubject.next(data);
        this.wardsSubject.next([]);
      });
  }

  loadWards(districtCode: number | string) {
    this.http.get<Ward[]>(`${this.API_HOST}/wards/${districtCode}`)
      .subscribe(data => {
        this.wardsSubject.next(data);
      });
  }

  // Methods for components that need live updates
  getProvinces(): Observable<Province[]> {
    return this.provinces$;
  }

  getDistricts(provinceCode: number | string): Observable<District[]> {
    this.loadDistricts(provinceCode);
    return this.districts$;
  }

  getWards(districtCode: number | string): Observable<Ward[]> {
    this.loadWards(districtCode);
    return this.wards$;
  }

  // New methods for direct HTTP calls (to avoid subject issues)
  fetchDistricts(provinceCode: number | string): Observable<District[]> {
    return this.http.get<District[]>(`${this.API_HOST}/districts/${provinceCode}`);
  }

  fetchWards(districtCode: number | string): Observable<Ward[]> {
    return this.http.get<Ward[]>(`${this.API_HOST}/wards/${districtCode}`);
  }
}