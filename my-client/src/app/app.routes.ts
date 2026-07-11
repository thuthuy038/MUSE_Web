import { Routes } from '@angular/router';

// Client components
import { Home } from './client/home/home';
import { ProductList } from './client/product-list/product-list';
import { Login } from './client/login/login';
import { SignUp } from './client/sign-up/sign-up';
import { Account } from './client/account/account';
import { AboutUs } from './client/about-us/about-us';
import { Vision } from './client/vision/vision';
import { SizeGuide } from './client/size-guide/size-guide';
import { ReturnPolicy } from './client/return-policy/return-policy';
import { CartComponent } from './client/cart/cart';
import { CheckOut } from './client/check-out/check-out';
import { ProductDetail } from './client/product-detail/product-detail';
import { Membership } from './client/membership/membership';
import { Community } from './client/community/community';
import { Blog } from './client/blog/blog';
import { ResetPassword } from './client/reset-password/reset-password';
import { VirtualTryOn } from './client/virtual-try-on/virtual-try-on';
import { OrderTracking } from './client/order-tracking/order-tracking';
import { PrivacyPolicy } from './client/privacy-policy/privacy-policy';
import { Wishlist } from './client/wishlist/wishlist';
import { Review } from './client/review/review';
import { Loyalty } from './client/loyalty/loyalty';
import { ChangeAddress } from './client/change-address/change-address';
import { OAuthRedirect } from './client/oauth-redirect/oauth-redirect';

// Admin components
import { AdminLayout } from './admin/admin-layout/admin-layout';
import { AdminLogin } from './admin/admin-login/admin-login';
import { AdminSignup } from './admin/admin-signup/admin-signup';
import { AdminResetPassword } from './admin/admin-resetpassword/admin-resetpassword';
import { AdminAccount } from './admin/admin-account/admin-account';
import { Dashboard } from './admin/dashboard/dashboard';
import { OrderManagement } from './admin/order-management/order-management';
import { OrderForm } from './admin/order-form/order-form';
import { ProductManagement } from './admin/product-management/product-management';
import { ProductForm } from './admin/product-form/product-form';
import { CategoryManagement } from './admin/category-management/category-management';
import { CategoryForm } from './admin/category-form/category-form';
import { UserManagement } from './admin/user-management/user-management';
import { UserForm } from './admin/user-form/user-form';
import { BlogManagement } from './admin/blog-management/blog-management';
import { BlogForm } from './admin/blog-form/blog-form';
import { BannerManagement } from './admin/banner-management/banner-management';
import { BannerForm } from './admin/banner-form/banner-form';
import { LiveChat } from './admin/live-chat/live-chat';
import { PromotionManagement } from './admin/promotion-management/promotion-management';
import { PromotionForm } from './admin/promotion-form/promotion-form';
import { ReviewManagementComponent } from './admin/review-management/review-management';
import { ReviewFormComponent } from './admin/review-form/review-form';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ClientGuard } from './guards/client.guard';
import { LookbookManagement } from './admin/lookbook-management/lookbook-management';
import { BlogDetail } from './client/blog-detail/blog-detail';

export const routes: Routes = [
    // Public routes (không cần đăng nhập)
    { path: '', component: Home },
    { path: 'productlist', component: ProductList },
    { path: 'login', component: Login },
    { path: 'sign-up', component: SignUp },
    { path: 'about-us', component: AboutUs },
    { path: 'vision', component: Vision },
    { path: 'size-guide', component: SizeGuide },
    { path: 'return-policy', component: ReturnPolicy },
    { path: 'cart', component: CartComponent },
    { path: 'productdetail/:id', component: ProductDetail },
    { path: 'membership', component: Membership },
    { path: 'community', component: Community },
    { path: 'blog', component: Blog },
    { path: 'blog/:id', component: BlogDetail },
    { path: 'resetpassword', component: ResetPassword },
    { path: 'try-on', component: VirtualTryOn },
    { path: 'privacy-policy', component: PrivacyPolicy },
    { path: 'oauth-redirect', component: OAuthRedirect },
    { path: 'checkout', component: CheckOut },

    // Customer routes (yêu cầu đăng nhập và role customer)
    { path: 'account', component: Account, canActivate: [ClientGuard] }, 
    { path: 'ordertracking', component: OrderTracking, canActivate: [ClientGuard] },
    { path: 'wishlist', component: Wishlist, canActivate: [ClientGuard] },
    { path: 'review', component: Review, canActivate: [ClientGuard] },
    { path: 'loyalty', component: Loyalty, canActivate: [ClientGuard] },
    { path: 'change-address', component: ChangeAddress, canActivate: [ClientGuard] },

    // Admin routes (có layout, yêu cầu đăng nhập và role admin)
    {
        path: 'admin',
        component: AdminLayout,
        canActivate: [AuthGuard, AdminGuard],
        children: [
            { path: 'account', component: AdminAccount },
            { path: 'dashboard', component: Dashboard },
            { path: 'order-management', component: OrderManagement },
            { path: 'order-add', component: OrderForm },
            { path: 'order-edit/:id', component: OrderForm },
            { path: 'product-management', component: ProductManagement },
            { path: 'product-add', component: ProductForm },
            { path: 'product-edit/:id', component: ProductForm },
            { path: 'category-management', component: CategoryManagement },
            { path: 'category-add', component: CategoryForm },
            { path: 'category-edit/:id', component: CategoryForm },
            { path: 'user-management', component: UserManagement },
            { path: 'user-add', component: UserForm },
            { path: 'user-edit/:id', component: UserForm },
            { path: 'blog-management', component: BlogManagement },
            { path: 'blog-add', component: BlogForm },
            { path: 'blog-edit/:id', component: BlogForm },
            { path: 'banner-management', component: BannerManagement },
            { path: 'banner-add', component: BannerForm },
            { path: 'banner-edit/:id', component: BannerForm },
            { path: 'live-chat', component: LiveChat },
            { path: 'promotion-management', component: PromotionManagement },
            { path: 'promotion-add', component: PromotionForm },
            { path: 'promotion-edit/:id', component: PromotionForm },
            { path: 'review-management', component: ReviewManagementComponent },
            { path: 'review-edit/:id', component: ReviewFormComponent },
            { path: 'lookbook-management', component: LookbookManagement },
        ]
    },
    // Các route admin không có layout (đăng nhập, đăng ký, quên mật khẩu)
    { path: 'admin/login', component: AdminLogin },
    { path: 'admin/signup', component: AdminSignup },
    { path: 'admin/reset', component: AdminResetPassword },

    // Fallback
    { path: '**', redirectTo: '' }
];