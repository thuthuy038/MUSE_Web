import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product';
import { CategoryService } from '../../services/category';
import { CommonModule } from '@angular/common';
import { QuillModule } from 'ngx-quill';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, QuillModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm implements OnInit {
  form!: FormGroup
  productId: any
  categories: any[] = []

  images: any[] = []
  previewImage: string | null = null

  sizes: string[] = []
  colors: string[] = []

  newSize: string = ''
  newColor: string = ''

  matrix: any = {}

   quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline'],        
      ['blockquote', 'code-block'],           
      [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
      [{ 'script': 'sub'}, { 'script': 'super' }], 
      [{ 'indent': '-1'}, { 'indent': '+1' }],    
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],   
      [{ 'color': [] }, { 'background': [] }],    
      [{ 'align': [] }],                           
      ['clean'],                                   
      ['link', 'image', 'video']                   
    ],
    scrollingContainer: '.ql-editor',
    bounds: 'self'
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService
  ) { }

  ngOnInit() {

    this.form = this.fb.group({
      code: [''],
      name: [''],
      category: [''],
      price: [''],
      discountPercent: [''],

      stock: [''],
      description: [''],

      status: ['active'],
      createdAt: [''],

      isNew: [false],
      isBestSeller: [false],

      images: [[]]
    })

    this.productId = this.route.snapshot.paramMap.get('id')

    if (this.productId) {
      this.loadProduct()
    } else {
      // tạo mới -> ngày hiện tại
      this.form.patchValue({
        createdAt: new Date().toISOString().substring(0, 10)
      })
    }

    this.categoryService.getCategories()
      .subscribe(res => {
        this.categories = res
      })
  }

  loadProduct() {
    this.productService.getProductById(this.productId)
      .subscribe((res: any) => {

        // reset
        this.sizes = []
        this.colors = []
        this.matrix = {}

        if (res.variants && res.variants.length) {

          res.variants.forEach((v: any) => {

            // thêm size
            if (!this.sizes.includes(v.size)) {
              this.sizes.push(v.size)
            }

            // thêm color
            if (!this.colors.includes(v.color)) {
              this.colors.push(v.color)
            }

            // tạo matrix
            if (!this.matrix[v.color]) {
              this.matrix[v.color] = {}
            }

            this.matrix[v.color][v.size] = v.quantity
          })
        }

        // patch form
        this.form.patchValue({
          ...res,
          createdAt: res.createdAt
            ? new Date(res.createdAt).toISOString().substring(0, 10)
            : ''
        })

        this.images = res.images || []

        this.updateStock()
      })
  }

  addSize() {
    if (!this.newSize || this.sizes.includes(this.newSize)) return

    this.sizes.push(this.newSize)

    this.colors.forEach(color => {
      if (!this.matrix[color]) this.matrix[color] = {}
      this.matrix[color][this.newSize] = 0
    })

    this.newSize = ''
  }

  addColor() {
    if (!this.newColor || this.colors.includes(this.newColor)) return

    this.colors.push(this.newColor)

    this.matrix[this.newColor] = {}
    this.sizes.forEach(size => {
      this.matrix[this.newColor][size] = 0
    })

    this.newColor = ''
  }

  removeSize(size: string) {
    this.sizes = this.sizes.filter(s => s !== size)

    this.colors.forEach(c => {
      delete this.matrix[c][size]
    })

    this.updateStock()
  }

  removeColor(color: string) {
    this.colors = this.colors.filter(c => c !== color)

    delete this.matrix[color]

    this.updateStock()
  }

  buildVariants() {
    const variants: any[] = []

    this.colors.forEach(color => {
      this.sizes.forEach(size => {
        const qty = Number(this.matrix[color]?.[size] || 0)

        if (qty > 0) {
          variants.push({
            size,
            color,
            quantity: qty
          })
        }
      })
    })

    return variants
  }

  updateStock() {
    let total = 0

    this.colors.forEach(c => {
      this.sizes.forEach(s => {
        total += Number(this.matrix[c]?.[s] || 0)
      })
    })

    this.form.patchValue({ stock: total })
  }

  uploadImages(event: any) {

    const files = event.target.files
    if (!files.length) return

    const formData = new FormData()

    for (let file of files) {
      formData.append("images", file)
    }

    this.productService
      .uploadImages(this.productId, formData)
      .subscribe((res: any) => {

        this.images = res.images

      })
  }

  openPreview(img: string) {
    this.previewImage = img
  }

  closePreview() {
    this.previewImage = null
  }

  deleteImage(img: any, event: Event) {

    event.stopPropagation()

    if (!confirm("Xóa ảnh này?")) return

    this.productService
      .deleteImage(this.productId, img.gridfsFileId)
      .subscribe(() => {

        this.images = this.images.filter(
          i => i.gridfsFileId !== img.gridfsFileId
        )

      })
  }

  save() {

    this.form.patchValue({
      images: this.images
    });

    const variants = this.buildVariants();
    const formData = { ...this.form.value };

    if (!formData.code || formData.code.trim() === '') {
      formData.code = '';
    }

    const data = {
      ...formData,
      variants: variants,
      createdAt: this.form.value.createdAt
        ? new Date(this.form.value.createdAt).getTime()
        : Date.now()
    };

    if (this.productId) {
      this.productService.updateProduct(this.productId, data)
        .subscribe(() => {
          alert("Cập nhật thành công")
          this.router.navigate(['/admin/product-management'])
        })
    } else {
      this.productService.createProduct(data)
        .subscribe(() => {
          alert("Thêm sản phẩm thành công")
          this.router.navigate(['/admin/product-management'])
        })
    }
  }

  cancel() {
    if (confirm("Bạn có chắc muốn hủy? Dữ liệu sẽ không được lưu!")) {
      this.router.navigate(['/admin/product-management'])
    }
  }
}
