export interface IOrder {
  _id?: string;
  id: string;             // ORD-2026-xxxxxx
  customerId: string;     // ID khách hàng
  customerName?: string;  // Tên khách hàng (hiển thị)
   
  // Mảng sản phẩm
  items?: {
    productId: string;
    name: string;
    image: string;
    quantity: number;
    price: number;
    size: String;  
    color: String;  
  }[];

  // Các trường chi phí
  totalPrice: number;     // Thêm dòng này để hết lỗi TS2339
  subTotal?: number;
  shippingFee?: number;
  
  promotion?: {
    code: string;
    discountAmount: number;
  };

  status: string;
  createdAt?: string;     // Dùng cho cột thời gian
  updatedAt?: string;
}