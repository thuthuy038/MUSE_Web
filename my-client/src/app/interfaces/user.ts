export interface IUser {
  _id: string;
  code: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  token?: string;
  avatar?: string | { url?: string };
  phone?: string;
  addresses?: Array<{
    fullName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    street: string;
    type: 'nha_rieng' | 'van_phong';
    isDefault: boolean;
  }>;
  gender?: string;
  birthday?: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  googleId?: string;
  facebookId?: string;
}
 