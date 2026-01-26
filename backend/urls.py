from django.contrib import admin
from django.urls import path, include
from board import views as board_views

urlpatterns = [
    path("admin/", admin.site.urls),

    # フロント（HTML）
    path("", include(("board.urls", "board"), namespace="board")),

    # API（JSON）
    path("api/", include(("board.api_urls", "board_api"))),

    # ログイン系
    path("accounts/", include("django.contrib.auth.urls")),
    path("accounts/", include(("accounts.urls", "accounts"), namespace="accounts")),
]
