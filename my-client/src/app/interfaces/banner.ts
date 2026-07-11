export interface Banner {

  _id: string
  title: string

  image: string   // id file GridFS

  status: 'active' | 'hidden'

  createdAt: string
  link?: string

}