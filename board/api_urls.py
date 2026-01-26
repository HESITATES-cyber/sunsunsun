from django.urls import path
from . import views

urlpatterns = [
    path("posts/<str:type>/", views.posts_by_type),
    path("posts/", views.create_post),
    path("posts/<int:id>/", views.update_delete_post),
    path("posts/<int:id>/like/", views.toggle_like),
]
