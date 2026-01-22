from django.shortcuts import render

# Create your views here.

# accounts/views.py
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Profile
from django.contrib.auth.models import User
from .forms import SignUpForm
from django.contrib.auth import login

@login_required
def profile(request):
    profile = request.user.profile  # すでに get_or_create 済みなので安心

    if request.method == "POST":
        nickname = request.POST.get("nickname", "").strip()
        # アイコンは今回は無視するならスキップ可能
        profile.nickname = nickname or profile.nickname
        profile.save()
        return redirect("accounts:profile")

    return render(request, "accounts/profile.html", {"profile": profile})

def signup(request):
    if request.method == "POST":
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            user.profile.nickname = form.cleaned_data["nickname"]
            user.profile.save()
            login(request, user)
            return redirect("board:index")
    else:
        form = SignUpForm()

    return render(request, "accounts/signup.html", {"form": form})
