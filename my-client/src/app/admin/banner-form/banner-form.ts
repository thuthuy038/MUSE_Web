import { Component, Input, Output, EventEmitter } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

@Component({
selector:'app-banner-form',
standalone:true,
imports:[CommonModule,FormsModule],
templateUrl:'./banner-form.html',
styleUrls:['./banner-form.css']
})

export class BannerForm{

@Input() banner:any
@Output() close = new EventEmitter()

bannerForm:any = {
title:'',
image:'',
 link:'',
status:'active'
}

previewImage:any = null

uploading = false
saving = false

toastMessage = ''
showToast = false

constructor(private http:HttpClient){}

ngOnInit(){

if(this.banner){

this.bannerForm = { ...this.banner }

this.previewImage =
'https://server-testing-ymn9.onrender.com/api/images/' + this.banner.image

}

}

/* CHỌN FILE */

onFileSelected(event:any){

const file = event.target.files[0]

if(!file) return

this.uploading = true

const reader = new FileReader()

reader.onload = () => {

this.previewImage = reader.result

}

reader.readAsDataURL(file)

this.uploadImage(file)

}

/* UPLOAD ẢNH */

uploadImage(file:any){

const formData = new FormData()

formData.append('image', file)

this.http.post<any>(
'https://server-testing-ymn9.onrender.com/api/upload',
formData
).subscribe({

next:(res)=>{

this.bannerForm.image = res.fileId
this.uploading = false

},

error:(err)=>{

console.log(err)

this.showToastMessage("Upload ảnh thất bại")

this.uploading = false

}

})

}

/* TOAST */

showToastMessage(message:string){

this.toastMessage = message
this.showToast = true

setTimeout(()=>{
this.showToast = false
},2500)

}

/* SAVE */

saveBanner(){

if(this.saving) return

if(this.uploading){

this.showToastMessage("Ảnh đang upload, vui lòng chờ")
return

}

if(!this.bannerForm.title){

this.showToastMessage("Vui lòng nhập tên banner")
return

}

if(!this.bannerForm.image){

this.showToastMessage("Vui lòng chọn ảnh")
return

}

this.saving = true

/* UPDATE */

if(this.banner){

this.http.put(
`https://server-testing-ymn9.onrender.com/api/banners/${this.banner._id}`,
this.bannerForm
).subscribe({

next:()=>{

this.showToastMessage("Cập nhật banner thành công")

setTimeout(()=>{
this.close.emit()
},1200)

},

error:(err)=>{

console.log(err)

this.showToastMessage("Cập nhật banner thất bại")

this.saving = false

}

})

}

/* ADD */

else{

this.http.post(
'https://server-testing-ymn9.onrender.com/api/banners',
this.bannerForm
).subscribe({

next:()=>{

this.showToastMessage("Thêm banner thành công")

setTimeout(()=>{
this.close.emit()
},1200)

},

error:(err)=>{

console.log(err)

this.showToastMessage("Thêm banner thất bại")

this.saving = false

}

})

}

}

/* CANCEL */

cancel(){

this.close.emit()

}

}