# accounts/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = "accounts"

urlpatterns = [
    # ログイン
    path("login/", auth_views.LoginView.as_view(template_name="accounts/login.html"), name="login"),
    # ログアウト    
    path("logout/", auth_views.LogoutView.as_view(next_page="/"), name="logout"),
    # プロフィール編集
    path("profile/", views.profile, name="profile"),

    path("signup/", views.signup, name="signup"),

]
