from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from .models import Profile

class SignUpForm(UserCreationForm):
    nickname = forms.CharField(max_length=50, required=True, label="表示名")

    class Meta:
        model = User
        fields = ("username", "nickname", "password1", "password2")

class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ["nickname", "icon"]