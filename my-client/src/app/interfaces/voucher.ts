export interface IVoucher {
  _id: string;
  code: string;
  status: 'unused' | 'used';
  description?: string; // Thêm dòng này để hiện mô tả voucher
  promotionId?: any; 
  orderId?: string | null;
  usedDate?: Date | null;
}