import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from '../../services/category';

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryForm implements OnInit {

  form!: FormGroup
  categoryId: any

  banner: any[] = []
  previewImage: string | null = null

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService
  ) { }

  ngOnInit() {

    this.form = this.fb.group({
      code: [''],
      name: [''],
      url: [''],
      externalLink: [''],
      description: [''],
      status: [''],
      type: [''],
      createdAt: ['']
    })

    this.categoryId = this.route.snapshot.paramMap.get('id')

    if (this.categoryId) {
      this.loadCategory()
    }
  }

  loadCategory() {

    this.categoryService.getCategoryById(this.categoryId)
      .subscribe((res: any) => {

        console.log("Category:", res)

        if (res.createdAt) {
          res.createdAt = new Date(res.createdAt).toISOString().split('T')[0];
        }

        this.form.patchValue(res ?? {})

        this.banner = res.banner || []

      })
  }

  uploadBanner(event: any) {

    const files = event.target.files
    if (!files.length) return

    const formData = new FormData()

    for (let file of files) {
      formData.append("banner", file)
    }

    this.categoryService
      .uploadBanner(this.categoryId, formData)
      .subscribe((res: any) => {

        this.banner = res.banner

      })
  }

  openPreview(img: string) {
    this.previewImage = img
  }

  closePreview() {
    this.previewImage = null
  }

  deleteBanner(img: any, event: Event) {

    event.stopPropagation()

    if (!confirm("Xóa ảnh này?")) return

    this.categoryService
      .deleteBanner(this.categoryId, img.gridfsFileId)
      .subscribe(() => {

        this.banner = this.banner.filter(
          i => i.gridfsFileId !== img.gridfsFileId
        )

      })
  }

  save() {
    // Tạo bản sao dữ liệu từ form
    const data = { ...this.form.value };

    // Xóa trường code nếu người dùng không nhập để server tự tạo qua middleware
    if (!data.code || data.code.trim() === '') {
      delete data.code;
    }

    // Đảm bảo banner được cập nhật mới nhất
    data.banner = this.banner;

    if (this.categoryId) {
      this.categoryService.updateCategory(this.categoryId, data)
        .subscribe(() => {
          alert("Cập nhật thành công");
          this.router.navigate(['/admin/category-management']); 
        });
    } else {
      this.categoryService.createCategory(data)
        .subscribe(() => {
          alert("Thêm mới thành công");
          this.router.navigate(['/admin/category-management']);
        });
    }
  }

  cancel() {
    if (confirm("Bạn có chắc muốn hủy? Dữ liệu sẽ không được lưu!")) {
      this.router.navigate(['/admin/category-management'])
    }
  }

}
