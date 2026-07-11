import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review.html',
  styleUrls: ['./review.css']
})
export class Review implements OnInit {

  order: any;
  forms: any[] = []; // Mảng chứa data form cho từng sản phẩm

  availableTags = [
    { text: 'Sản phẩm đẹp !!!', icon: 'bi-hand-thumbs-up', rating: 5 },
    { text: 'Quá xịn xòooo', icon: 'bi-emoji-smile', rating: 5 },
    { text: 'Sẽ mua lại', icon: 'bi-heart', rating: 4 },
    { text: 'Cũng được à', icon: 'bi-emoji-neutral', rating: 3 },
    { text: 'Hơi tệ nha', icon: 'bi-emoji-frown', rating: 2 },
    { text: 'Quá tệ !!!', icon: 'bi-emoji-sad', rating: 1 }
  ];

  constructor(
    private router: Router,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    const state = history.state;
    if (!state || !state.order) {
      this.router.navigate(['/ordertracking']);
      return;
    }

    this.order = state.order;
    this.initForms();
  }

  async initForms() {
    const user = this.userService.currentUserValue;
    if (!user) return;

    // Lặp qua từng sản phẩm trong đơn hàng để tạo form
    for (let item of this.order.items) {
      const productId = item.productId?._id || item.productId;

      const form = {
        item: item,
        productId: productId,
        orderDbId: this.order._id,
        isReviewed: false,
        reviewId: null,
        selectedRating: 5,
        comment: '',
        selectedTag: null as any,

        // Dữ liệu cũ (từ DB nếu đã đánh giá)
        oldImages: [] as any[],
        oldVideos: [] as any[],

        // Dữ liệu mới (user chọn thêm)
        previewImages: [] as string[],
        imageFiles: [] as File[],
        previewVideos: [] as string[],
        videoFiles: [] as File[],

        isSubmitting: false
      };

      // Check xem đã đánh giá chưa
      try {
        const checkRes = await fetch(`http://localhost:3000/api/reviews/check?userId=${user._id}&productId=${productId}&orderId=${this.order._id}`);
        const checkData = await checkRes.json();

        if (checkData.exists && checkData.reviewId) {
          form.isReviewed = true;
          form.reviewId = checkData.reviewId;

          // Lấy chi tiết đánh giá để điền vào form
          const detailRes = await fetch(`http://localhost:3000/api/reviews/${checkData.reviewId}`);
          const detailData = await detailRes.json();

          form.selectedRating = detailData.rating;
          form.comment = detailData.content;
          form.oldImages = detailData.images || [];
          form.oldVideos = detailData.videos || [];

          // Match tag nếu có
          const matchedTag = this.availableTags.find(t => t.text === detailData.content);
          if (matchedTag) form.selectedTag = matchedTag;
        }
      } catch (err) {
        console.error("Lỗi lấy dữ liệu review cũ:", err);
      }

      this.forms.push(form);
    }
  }

  setRating(formIndex: number, rating: number) {
    this.forms[formIndex].selectedRating = rating;
  }

  toggleTag(formIndex: number, tag: any) {
    this.forms[formIndex].selectedTag = tag;
    this.forms[formIndex].comment = tag.text;
    this.forms[formIndex].selectedRating = tag.rating;
  }

  isTagSelected(formIndex: number, tag: any) {
    return this.forms[formIndex].selectedTag === tag;
  }

  // ================= QUẢN LÝ FILE CHO TỪNG FORM =================
  handleImages(formIndex: number, event: any) {
    const files = event.target.files;
    if (!files) return;
    for (let file of files) {
      this.forms[formIndex].imageFiles.push(file);
      this.forms[formIndex].previewImages.push(URL.createObjectURL(file));
    }
  }

  removeNewImage(formIndex: number, index: number) {
    this.forms[formIndex].previewImages.splice(index, 1);
    this.forms[formIndex].imageFiles.splice(index, 1);
  }

  removeOldImage(formIndex: number, index: number) {
    this.forms[formIndex].oldImages.splice(index, 1);
  }

  handleVideos(formIndex: number, event: any) {
    const files = event.target.files;
    if (!files) return;
    for (let file of files) {
      this.forms[formIndex].videoFiles.push(file);
      this.forms[formIndex].previewVideos.push(URL.createObjectURL(file));
    }
  }

  removeNewVideo(formIndex: number, index: number) {
    this.forms[formIndex].previewVideos.splice(index, 1);
    this.forms[formIndex].videoFiles.splice(index, 1);
  }

  removeOldVideo(formIndex: number, index: number) {
    this.forms[formIndex].oldVideos.splice(index, 1);
  }

  // ================= SUBMIT / EDIT / DELETE =================
  async submitFeedback(formIndex: number) {
    const form = this.forms[formIndex];
    if (form.isSubmitting) return;

    try {
      const user = this.userService.currentUserValue;
      if (!user) { alert("Bạn cần đăng nhập"); return; }

      form.isSubmitting = true;

      // Upload ảnh mới
      const newUploadedImages: any[] = [];
      for (let file of form.imageFiles) {
        const formData = new FormData();
        formData.append('image', file);
        const res: any = await fetch('http://localhost:3000/api/upload', { method: 'POST', body: formData }).then(r => r.json());
        newUploadedImages.push({ url: `/api/images/${res.fileId}`, fileId: res.fileId });
      }

      // Upload video mới
      const newUploadedVideos: any[] = [];
      for (let file of form.videoFiles) {
        const formData = new FormData();
        formData.append('image', file); // API của bạn xài chung key 'image'
        const res: any = await fetch('http://localhost:3000/api/upload', { method: 'POST', body: formData }).then(r => r.json());
        newUploadedVideos.push({ url: `/api/images/${res.fileId}`, fileId: res.fileId });
      }

      // Gộp ảnh/video cũ và mới
      const finalImages = [...form.oldImages, ...newUploadedImages];
      const finalVideos = [...form.oldVideos, ...newUploadedVideos];

      const payload = {
        userId: user._id,
        productId: form.productId,
        orderId: form.orderDbId,
        rating: form.selectedRating,
        content: form.comment,
        images: finalImages,
        videos: finalVideos,
        size: form.item.size,
        color: form.item.color
      };

      if (form.isReviewed && form.reviewId) {
        // GỌI API EDIT (PUT)
        await fetch(`http://localhost:3000/api/reviews/${form.reviewId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        alert(`Đã cập nhật đánh giá cho: ${form.item.name}`);
      } else {
        // GỌI API CREATE (POST)
        const res = await fetch('http://localhost:3000/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        form.isReviewed = true;
        form.reviewId = data.data._id;
        alert(`Đã lưu đánh giá thành công cho: ${form.item.name}`);
      }

      // Reset file tạm
      form.imageFiles = []; form.previewImages = [];
      form.videoFiles = []; form.previewVideos = [];
      form.oldImages = finalImages;
      form.oldVideos = finalVideos;
      form.isSubmitting = false;

    } catch (error) {
      console.error("Lỗi gửi review:", error);
      alert("Không lưu được đánh giá!");
      form.isSubmitting = false;
    }
  }

  async deleteFeedback(formIndex: number) {
    const form = this.forms[formIndex];
    if (!form.reviewId) return;

    if (confirm("Bạn có chắc chắn muốn xoá đánh giá này?")) {
      try {
        form.isSubmitting = true;
        await fetch(`http://localhost:3000/api/reviews/${form.reviewId}`, { method: 'DELETE' });

        // Reset form về trạng thái chưa đánh giá
        form.isReviewed = false;
        form.reviewId = null;
        form.selectedRating = 5;
        form.comment = '';
        form.oldImages = [];
        form.oldVideos = [];
        form.selectedTag = null;
        form.isSubmitting = false;
        alert("Đã xoá đánh giá thành công!");
      } catch (err) {
        console.error(err);
        alert("Lỗi khi xoá đánh giá.");
        form.isSubmitting = false;
      }
    }
  }

  goBack() {
    this.router.navigate(['/ordertracking']);
  }

  goToProduct(item: any) {
    const productId = item.productId?._id || item.productId;
    if (!productId) return;

    this.router.navigate(['/productdetail', productId]);
  }
}