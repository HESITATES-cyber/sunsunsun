# board/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, render
import json
from .models import Post

# ============================
# 投稿一覧（誰でもOK）
# ============================
def posts_by_type(request, type):
    try:
        posts = (
            Post.objects
            .filter(type__iexact=type)
            .select_related("user")
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
                    "nickname": profile.nickname if profile else p.user.username,
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

    body = json.loads(request.body)
    post = Post.objects.create(
        user=request.user,
        type=body["type"],
        text=body["text"]
    )

    profile = request.user.profile

    return JsonResponse({
        "id": post.id,
        "text": post.text,
        "likes": 0,
        "is_mine": True,
        "user": {
            "username": request.user.username,
            "nickname": profile.nickname,
            "icon": profile.icon.url if profile.icon else None
        }
    })


# ============================
# 編集 & 削除（本人のみ）
# ============================
@login_required
@csrf_exempt
def update_delete_post(request, id):
    post = get_object_or_404(Post, id=id)

    if post.user != request.user:
        return JsonResponse({"error": "Forbidden"}, status=403)

    if request.method == "PUT":
        body = json.loads(request.body)
        post.text = body.get("text", post.text)
        post.save()
        return JsonResponse({
        "ok": True,
        "id": post.id,
        "text": post.text,
        "time": post.created_at.strftime("%Y-%m-%d %H:%M")
        })

    if request.method == "DELETE":
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