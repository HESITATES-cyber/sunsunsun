from django.urls import path
from . import views

app_name = "board"

urlpatterns = [
    # =========================
    # フロント（HTMLページ）
    # =========================
    path("", views.index, name="index"),
    path("characters/", views.characters, name="characters"),
    path("board/", views.board_page, name="board"),

    # =========================
    # API（JSONのみ）
    # =========================
    path("api/posts/<str:type>/", views.posts_by_type),
    path("api/posts/", views.create_post),
    path("api/posts/<int:id>/", views.update_delete_post),
    path("api/posts/<int:id>/like/", views.toggle_like),
]
