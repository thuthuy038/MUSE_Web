export interface IVariant {
  size: string;
  color: string;
  quantity: number;
}

export interface IProduct {
  _id: string;
  name: string;
  category: string;
  price: number;
  discountPercent: number;
  discountPrice: number;
  images: any[]; // có thể là object có url
  description: string;
  rating: number;
  material: string;
  isNew: boolean;
  isBestSeller: boolean;
  inventory: number;
  sold?: number;
  createdAt?: number;
  stock: number;
  status: 'active' | 'featured' | 'disabled';
  variants: IVariant[];
}