from django.urls import path
from . import views

app_name = "board"

urlpatterns = [
    path("", views.index, name="index"),
    path("characters/", views.characters, name="characters"),
    path("board/", views.board_page, name="board"),
]
