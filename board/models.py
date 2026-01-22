from django.db import models
from django.contrib.auth.models import User


class Post(models.Model):
    TYPE_CHOICES = [
        ("cfex", "CFEX"),
        ("cshe", "CSHE"),
        ("mwfx", "MWFX"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="posts"
    )

    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES
    )

    text = models.TextField()

    likes = models.ManyToManyField(
        User,
        related_name="liked_posts",
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def like_count(self):
        return self.likes.count()

    def __str__(self):
        return f"{self.type} | {self.user.username} | {self.text[:30]}"
