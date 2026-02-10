# board/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, render
import json
from .models import Post
from django.shortcuts import render

def result(request):
    return render(request, "board/result.html")


# ============================
# 投稿一覧（誰でもOK）
# ============================
print("🔥 THIS views.py IS USED 🔥")

def posts_by_type(request, type):
    try:
        posts = (
            Post.objects
            .filter(type__iexact=type)
            .select_related("user", "user__profile")
            .prefetch_related("likes")
            .order_by("-created_at")
        )

        data = []

        for p in posts:
            profile = getattr(p.user, "profile", None)

            data.append({
                "id": p.id,
                "text": p.text,
                "time": p.created_at.strftime("%Y-%m-%d %H:%M"),
                "likes": p.likes.count(),
                "is_liked": (
                    request.user.is_authenticated and
                    p.likes.filter(id=request.user.id).exists()
                ),
                "is_mine": (
                    request.user.is_authenticated and
                    request.user == p.user
                ),
                "user": {
                    "id": p.user.id,
                    "username": p.user.username,
                    "nickname": (profile.nickname if profile and profile.nickname else p.user.username),
                    "icon": profile.icon.url if profile and profile.icon else None,
                }
            })

        return JsonResponse(data, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ============================
# 新規投稿（ログイン必須）
# ============================
@login_required
@csrf_exempt
def create_post(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({"error": "login required"}, status=401)

    body = json.loads(request.body)

    post = Post.objects.create(
        user=request.user,
        type=body.get("type"),
        text=body.get("text", "")
    )

    profile = getattr(request.user, "profile", None)

    nickname = (
        profile.nickname
        if profile and getattr(profile, "nickname", "")
        else request.user.username
    )

    icon = (
        profile.icon.url
        if profile and getattr(profile, "icon", None)
        else None
    )

    return JsonResponse({
        "id": post.id,
        "text": post.text,
        "likes": 0,
        "is_mine": True,
        "user": {
            "id": request.user.id,
            "username": request.user.username,
            "nickname": nickname,  # ← 空なら username にする
            "icon": icon
        }
    })



# ============================
# 編集 & 削除（本人のみ）
# ============================
@login_required
@csrf_exempt
def update_delete_post(request, id):
    print("🔥 UPDATE_DELETE_POST HIT 🔥", request.method)
    post = get_object_or_404(Post, id=id)

    if post.user != request.user:
        return JsonResponse({"error": "Forbidden"}, status=403)

    if request.method == "PUT":
        body = json.loads(request.body)
        new_text = body.get("text")

        if new_text is None or new_text.strip() == "":
            return JsonResponse(
                {"error": "empty text"},
                status=400
            )

        post.text = new_text
        post.save()

        return JsonResponse({
            "id": post.id,
            "text": post.text,
            "time": post.created_at.strftime("%Y-%m-%d %H:%M"),
        })

    elif request.method == "DELETE":
        post.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Invalid method"}, status=405)


# ============================
# ❤️ いいね（ログイン必須）
# ============================
@login_required
@csrf_exempt
def toggle_like(request, id):
    post = get_object_or_404(Post, id=id)

    if request.user in post.likes.all():
        post.likes.remove(request.user)
        liked = False
    else:
        post.likes.add(request.user)
        liked = True

    return JsonResponse({
        "liked": liked,
        "likes": post.likes.count()
    })

def post_to_dict(post):
    profile = post.user.profile
    return {
        "id": post.id,
        "text": post.text,
        "type": post.type,
        "user": {
            "id": post.user.id,
            "nickname": profile.nickname,
            "icon": profile.icon.url if profile.icon else None,
        }
    }

# ============================
# トップページ
# ============================
def index(request):
    return render(request, "board/index.html")


# ============================
# キャラクター一覧ページ
# ============================
def characters(request):
    # ここでキャラクター一覧用テンプレートを返す
    return render(request, "board/characters.html")

# ============================
# 掲示板
# ============================
def board_page(request):
    return render(request, "board/board.html") 

print("📂 board.views loaded")


def result(request):
    return render(request, "board/result.html")
