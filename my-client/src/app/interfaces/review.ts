export interface IReview {

  _id?: string

  feedbackId?: string
  customerName?: string
  productName?: string

  orderId?: string 

  rating?: number
  content?: string
  status?: 'replied' | 'pending'
  createdAt?: string

  stars: number

  author?: string
  date?: string
  variant?: string
  text?: string
  hasPhoto?: boolean

}