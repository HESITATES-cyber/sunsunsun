from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    # 掲示板（フロント + API）
    path("", include(("board.urls", "board"), namespace="board")),

    # ログイン系
    path("accounts/", include("django.contrib.auth.urls")),
    path("accounts/", include("accounts.urls", namespace="accounts")),
]
