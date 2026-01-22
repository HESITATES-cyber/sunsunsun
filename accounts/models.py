from django.db import models

# Create your models here.

from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    nickname = models.CharField(max_length=50, blank=True)
    icon = models.ImageField(upload_to="icons/", blank=True, null=True)
    food_type = models.CharField(
        max_length=20,
        default="undecided"
    )

    def __str__(self):
        return self.nickname or self.user.username

