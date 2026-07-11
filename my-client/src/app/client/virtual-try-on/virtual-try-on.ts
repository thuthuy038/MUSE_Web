import { Component, OnDestroy, ViewChild, ElementRef, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { CartService } from '../../services/cart';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { ICartItem } from '../../interfaces/cartitem';

// Interface cho item có thể kéo thả với các thuộc tính nâng cao
interface DraggableItem {
  item: ICartItem;
  x: number; 
  y: number; 
  width: number;
  zIndex: number;
  opacity: number;
  rotation: number;
  scale: number;
  processedImage?: string; // Ảnh đã tách nền
}

@Component({
  selector: 'app-virtual-try-on',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], 
  templateUrl: './virtual-try-on.html',
  styleUrl: './virtual-try-on.css'
})
export class VirtualTryOn implements OnDestroy {
  private cartService = inject(CartService);
  cartItems$: Observable<ICartItem[]> = this.cartService.processedCartItems$;

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;
  @ViewChild('vtoFrame') vtoFrame?: ElementRef<HTMLDivElement>;
  @ViewChild('poseCanvas') poseCanvas?: ElementRef<HTMLCanvasElement>; 
  
  isCameraOn = false;
  uploadedImageUrl: string | ArrayBuffer | null = 'assets/images/default/model.jpg'; // Ảnh model mặc định
  cameraError: string | null = null;
  private stream: MediaStream | null = null;

  activeTryOnItems: DraggableItem[] = []; 
  private draggingItem: DraggableItem | null = null;
  private offsetX = 0;
  private offsetY = 0;
  private static zIndexCounter = 10;

  // AI Pose Detection
  private pose: Pose | null = null;
  private camera: Camera | null = null;
  isPoseDetectionActive = false;
  showSkeleton = true;
  private poseResults: any = null;
  shouldAutoPosition = true;
  isProcessingImage = false;
  enableBackgroundRemoval = true; // BẬT lại tách nền
  cropProductOnly = true; // Crop phần sản phẩm bên trái
  
  // Remove.bg API - AI tách nền chuyên nghiệp
  private readonly REMOVE_BG_API_KEY = 'YOUR_API_KEY'; // Thay bằng key thật
  private useRemoveBgAPI = false; // Bật khi có API key


  removeItem(itemId: string, size: string, color: string) {
  this.cartService.removeItem(itemId, size, color);
  this.activeTryOnItems = this.activeTryOnItems.filter(
    tryItem => !(tryItem.item.id === itemId && tryItem.item.size === size && tryItem.item.color === color)
  );
}

  // Khởi tạo AI Pose Detection
  private async initPoseDetection() {
    try {
      this.pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.pose.onResults((results) => {
        this.onPoseResults(results);
      });

      this.isPoseDetectionActive = true;
    } catch (error) {
      console.error('Lỗi khởi tạo Pose Detection:', error);
    }
  }

  // Xử lý kết quả phát hiện pose
  private onPoseResults(results: any) {
    this.poseResults = results;
    
    if (!this.poseCanvas || !this.vtoFrame) return;
    
    const canvasElement = this.poseCanvas.nativeElement;
    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    // Đặt kích thước canvas khớp với video
    const frameElement = this.vtoFrame.nativeElement;
    canvasElement.width = frameElement.offsetWidth;
    canvasElement.height = frameElement.offsetHeight;

    // Xóa canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Vẽ skeleton nếu bật
    if (this.showSkeleton && results.poseLandmarks) {
      canvasCtx.save();
      canvasCtx.translate(canvasElement.width, 0);
      canvasCtx.scale(-1, 1);
      
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, 
        { color: '#00FF00', lineWidth: 4 });
      drawLandmarks(canvasCtx, results.poseLandmarks, 
        { color: '#FF0000', lineWidth: 2, radius: 6 });
      
      canvasCtx.restore();
    }

    // Tự động định vị quần áo
    if (this.shouldAutoPosition && results.poseLandmarks) {
      this.autoPositionClothes(results.poseLandmarks);
    }
  }

  // Tự động định vị quần áo dựa trên vị trí cơ thể
  private autoPositionClothes(landmarks: any[]) {
    if (!this.vtoFrame || this.activeTryOnItems.length === 0) return;

    const frameElement = this.vtoFrame.nativeElement;
    const frameWidth = frameElement.offsetWidth;
    const frameHeight = frameElement.offsetHeight;

    // Các điểm landmark quan trọng
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];

    if (!leftShoulder || !rightShoulder) return;

    // Tính toán vị trí trung tâm ngực
    const centerChestX = ((leftShoulder.x + rightShoulder.x) / 2) * frameWidth;
    const centerChestY = ((leftShoulder.y + rightShoulder.y) / 2) * frameHeight;

    // Tính toán vị trí hông
    const centerHipX = ((leftHip?.x + rightHip?.x) / 2) * frameWidth;
    const centerHipY = ((leftHip?.y + rightHip?.y) / 2) * frameHeight;

    // Tính chiều rộng vai
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x) * frameWidth;

    this.activeTryOnItems.forEach(tryItem => {
      const itemName = tryItem.item.name.toLowerCase();
      
      // Phân loại sản phẩm và đặt vị trí
      if (itemName.includes('áo') || itemName.includes('shirt') || itemName.includes('top')) {
        // Đặt áo ở vị trí ngực
        tryItem.width = shoulderWidth * 1.2; // Rộng hơn vai một chút
        tryItem.x = centerChestX - tryItem.width / 2;
        tryItem.y = centerChestY - tryItem.width * 0.3;
      } else if (itemName.includes('quần') || itemName.includes('pants') || itemName.includes('shorts')) {
        // Đặt quần ở vị trí hông
        tryItem.width = shoulderWidth * 1.1;
        tryItem.x = centerHipX - tryItem.width / 2;
        tryItem.y = centerHipY - tryItem.width * 0.2;
      } else if (itemName.includes('váy') || itemName.includes('dress') || itemName.includes('skirt')) {
        // Đặt váy từ ngực xuống
        tryItem.width = shoulderWidth * 1.3;
        tryItem.x = centerChestX - tryItem.width / 2;
        tryItem.y = centerChestY;
      } else {
        // Mặc định đặt ở giữa ngực
        tryItem.width = shoulderWidth * 1.2;
        tryItem.x = centerChestX - tryItem.width / 2;
        tryItem.y = centerChestY - tryItem.width * 0.3;
      }
    });
  }

  // Toggle hiển thị skeleton
  toggleSkeleton() {
    this.showSkeleton = !this.showSkeleton;
  }

  // Toggle tự động định vị
  toggleAutoPosition() {
    this.shouldAutoPosition = !this.shouldAutoPosition;
  }

  // Chụp ảnh
  capturePhoto() {
    if (!this.vtoFrame) return;
    
    const frameElement = this.vtoFrame.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = frameElement.offsetWidth;
    canvas.height = frameElement.offsetHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Vẽ video hoặc ảnh
    if (this.isCameraOn && this.videoElement) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(this.videoElement.nativeElement, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    } else if (this.uploadedImageUrl) {
      const img = frameElement.querySelector('.vto-image') as HTMLImageElement;
      if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // Vẽ các item quần áo
    this.activeTryOnItems.forEach(tryItem => {
      const img = new Image();
      img.src = tryItem.item.image;
      ctx.save();
      ctx.globalAlpha = tryItem.opacity;
      ctx.translate(tryItem.x + tryItem.width / 2, tryItem.y + tryItem.width * 0.65);
      ctx.rotate((tryItem.rotation * Math.PI) / 180);
      ctx.scale(tryItem.scale, tryItem.scale);
      ctx.drawImage(img, -tryItem.width / 2, -tryItem.width * 0.65, tryItem.width, tryItem.width * 1.3);
      ctx.restore();
    });

    // Tải xuống
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `virtual-tryon-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  // Hàm crop phần sản phẩm bên trái (50% trái của ảnh)
  private async cropProductImage(imageUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Lấy 50% bên trái của ảnh gốc
        canvas.width = img.width / 2;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        // Vẽ phần bên trái của ảnh (từ x=0 đến x=width/2)
        ctx.drawImage(
          img,
          0, 0, img.width / 2, img.height,  
          0, 0, canvas.width, canvas.height 
        );

        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  }

  // Tách nền bằng Remove.bg API (AI chuyên nghiệp)
  private async removeBackgroundWithAPI(imageUrl: string): Promise<string> {
    try {
      console.log('🤖 Đang gọi Remove.bg API...');
      
      // Convert image URL to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Tạo FormData
      const formData = new FormData();
      formData.append('image_file', blob);
      formData.append('size', 'auto');
      
      // Gọi API
      const apiResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': this.REMOVE_BG_API_KEY
        },
        body: formData
      });
      
      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status}`);
      }
      
      // Convert response to base64
      const resultBlob = await apiResponse.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(resultBlob);
      });
    } catch (error) {
      console.error('❌ Lỗi Remove.bg API:', error);
      return imageUrl; 
    }
  }

 
  // Phát hiện vùng foreground (sản phẩm) vs background (nền) bằng edge detection
  private async removeBackground(imageUrl: string): Promise<string> {
    // Nếu có API key, dùng Remove.bg
    if (this.useRemoveBgAPI && this.REMOVE_BG_API_KEY !== 'YOUR_API_KEY') {
      return this.removeBackgroundWithAPI(imageUrl);
    }
    
    // Fallback: Thuật toán FLOOD FILL - Tìm và xóa vùng liên thông từ viền
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        // Vẽ ảnh gốc
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        console.log('🎨 Bắt đầu Flood Fill từ 4 góc...');

        // Tạo mask để đánh dấu pixel đã xử lý
        const visited = new Uint8Array(canvas.width * canvas.height);
        const toRemove = new Uint8Array(canvas.width * canvas.height);
        
        // Flood fill từ 4 góc (nền thường ở góc)
        const startPoints = [
          [0, 0], // Trên trái
          [canvas.width - 1, 0], // Trên phải
          [0, canvas.height - 1], // Dưới trái
          [canvas.width - 1, canvas.height - 1] // Dưới phải
        ];

        const tolerance = 35; // Độ sai lệch màu chấp nhận được

        for (const [startX, startY] of startPoints) {
          this.floodFill(data, visited, toRemove, canvas.width, canvas.height, 
                         startX, startY, tolerance);
        }

        // Xóa nền
        let removedCount = 0;
        for (let i = 0; i < toRemove.length; i++) {
          if (toRemove[i] === 1) {
            data[i * 4 + 3] = 0; // Trong suốt
            removedCount++;
          }
        }

        console.log(`✂️ Đã xóa ${removedCount} pixels (${((removedCount / toRemove.length) * 100).toFixed(1)}%)`);

        // Làm mịn viền
        this.smoothEdges(data, canvas.width, canvas.height);

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => {
        console.error('❌ Không thể load ảnh');
        resolve(imageUrl);
      };
      img.src = imageUrl;
    });
  }

  // Thuật toán Flood Fill - Tìm vùng liên thông có màu giống nhau
  private floodFill(
    data: Uint8ClampedArray,
    visited: Uint8Array,
    toRemove: Uint8Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    tolerance: number
  ) {
    const stack: Array<[number, number]> = [[startX, startY]];
    const startIdx = startY * width + startX;
    
    if (visited[startIdx] === 1) return;
    
    const startColor = {
      r: data[startIdx * 4],
      g: data[startIdx * 4 + 1],
      b: data[startIdx * 4 + 2]
    };

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[idx] === 1) continue;

      const r = data[idx * 4];
      const g = data[idx * 4 + 1];
      const b = data[idx * 4 + 2];

      // Kiểm tra màu có giống màu bắt đầu không
      const colorDiff = Math.sqrt(
        Math.pow(r - startColor.r, 2) +
        Math.pow(g - startColor.g, 2) +
        Math.pow(b - startColor.b, 2)
      );

      if (colorDiff > tolerance) continue;

      visited[idx] = 1;
      toRemove[idx] = 1;

      // Thêm 4 pixel xung quanh vào stack
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
  }

  // Làm mịn viền
  private smoothEdges(data: Uint8ClampedArray, width: number, height: number) {
    const newData = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        
        if (data[i + 3] > 0 && data[i + 3] < 255) {
          // Pixel ở viền - làm mịn
          let sumAlpha = 0;
          let count = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ni = ((y + dy) * width + (x + dx)) * 4;
              sumAlpha += data[ni + 3];
              count++;
            }
          }
          
          newData[i + 3] = Math.floor(sumAlpha / count);
        }
      }
    }
    
    data.set(newData);
  }

  // Phát hiện edges bằng Sobel operator (dùng làm backup nếu Flood Fill không hiệu quả)
  private detectEdges(data: Uint8ClampedArray, width: number, height: number): Float32Array {
    const edges = new Float32Array(width * height);
    
    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Apply Sobel kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const i = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const ki = (ky + 1) * 3 + (kx + 1);
            
            gx += gray * sobelX[ki];
            gy += gray * sobelY[ki];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy) / 1000; // Normalize
        edges[y * width + x] = Math.min(magnitude, 1);
      }
    }
    
    return edges;
  }

  // Tìm bounding box của vùng có nhiều edges
  private findContentBoundingBox(edges: Float32Array, width: number, height: number) {
    const threshold = 0.15; // Edge threshold
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let hasContent = false;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x] > threshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          hasContent = true;
        }
      }
    }
    
    // Nếu không tìm thấy edges, dùng center crop
    if (!hasContent) {
      return {
        minX: Math.floor(width * 0.1),
        maxX: Math.floor(width * 0.9),
        minY: Math.floor(height * 0.1),
        maxY: Math.floor(height * 0.9)
      };
    }
    
    return { minX, maxX, minY, maxY };
  }

  // (Các hàm còn lại giữ nguyên...)
  async onTryItem(itemToTry: ICartItem) {
    const isAlreadyTrying = this.activeTryOnItems.find(
      tryItem => tryItem.item.id === itemToTry.id && tryItem.item.size === itemToTry.size && tryItem.item.color === itemToTry.color
    );
    if (isAlreadyTrying) {
      isAlreadyTrying.zIndex = ++VirtualTryOn.zIndexCounter;
      return;
    }

    // Hiển thị loading khi xử lý
    this.isProcessingImage = true;

    try {
      let processedImage = itemToTry.image;

      // Bước 1: Crop phần sản phẩm bên trái (nếu bật)
      if (this.cropProductOnly) {
        processedImage = await this.cropProductImage(processedImage);
      }

      // Bước 2: Tách nền (nếu bật)
      if (this.enableBackgroundRemoval) {
        processedImage = await this.removeBackground(processedImage);
      }

      this.activeTryOnItems.push({
        item: itemToTry,
        x: 50, y: 50, width: 200,
        zIndex: ++VirtualTryOn.zIndexCounter,
        opacity: 1.0,
        rotation: 0,
        scale: 1.0,
        processedImage: processedImage
      });
    } catch (error) {
      console.error('Lỗi xử lý ảnh:', error);
      // Fallback: sử dụng ảnh gốc
      this.activeTryOnItems.push({
        item: itemToTry,
        x: 50, y: 50, width: 200,
        zIndex: ++VirtualTryOn.zIndexCounter,
        opacity: 1.0,
        rotation: 0,
        scale: 1.0,
        processedImage: itemToTry.image
      });
    } finally {
      this.isProcessingImage = false;
    }
  }

  onCloseTryOnItem(itemToClose: DraggableItem, event: MouseEvent) {
    event.stopPropagation();
    this.activeTryOnItems = this.activeTryOnItems.filter(tryItem => tryItem !== itemToClose);
  }

  onDragStart(event: MouseEvent, item: DraggableItem) {
    event.preventDefault();
    this.draggingItem = item;
    item.zIndex = ++VirtualTryOn.zIndexCounter;
    const itemRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.offsetX = event.clientX - itemRect.left;
    this.offsetY = event.clientY - itemRect.top;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.draggingItem) return;
    if (!this.vtoFrame) return;
    
    const containerRect = this.vtoFrame.nativeElement.getBoundingClientRect();
    
    // Tính vị trí mới - cho phép di chuyển tự do trong toàn bộ frame
    const newX = event.clientX - containerRect.left - this.offsetX;
    const newY = event.clientY - containerRect.top - this.offsetY;
    
    // Cập nhật vị trí trực tiếp, không giới hạn
    this.draggingItem.x = newX;
    this.draggingItem.y = newY;
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.draggingItem = null;
  }
  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImageUrl = e.target?.result || null;
        this.stopCamera(); 
      };
      reader.readAsDataURL(file);
    }
  }

  async startCamera() {
    this.stopCamera();
    this.uploadedImageUrl = null;
    this.cameraError = null;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 } 
      });
      this.isCameraOn = true;
      
      setTimeout(async () => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          await this.videoElement.nativeElement.play();
          
          // Khởi tạo AI Pose Detection
          if (!this.pose) {
            await this.initPoseDetection();
          }
          
          // Bắt đầu phát hiện pose
          if (this.pose && this.videoElement) {
            this.camera = new Camera(this.videoElement.nativeElement, {
              onFrame: async () => {
                if (this.pose && this.videoElement) {
                  await this.pose.send({ image: this.videoElement.nativeElement });
                }
              },
              width: 1280,
              height: 720
            });
            this.camera.start();
          }
        }
      }, 100);
    } catch (err) {
      console.error("Lỗi bật camera:", err);
      this.cameraError = "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập trên trình duyệt của bạn.";
      this.isCameraOn = false;
    }
  }

  stopCamera() {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isCameraOn = false;
    this.isPoseDetectionActive = false;
  }

  ngOnDestroy() {
    this.stopCamera();
  }
}