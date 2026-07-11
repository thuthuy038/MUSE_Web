export interface ICategory {
  _id: string;
  code: string;
  name: string;
  key: string;
  type: 'category' | 'collection';
  banner: string[]; 
  status: 'active' | 'featured' | 'inactive';
  description: string;
  url?: string
  externalLink?: string
  createdAt: Date;
  updatedAt?: Date;
}