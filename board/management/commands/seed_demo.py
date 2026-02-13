import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.apps import apps
from django.utils import timezone


# 16タイプ
DEFAULT_TYPES = [
    "cfew", "cmhw", "cmew", "cfhw",
    "cfhx", "cmex", "cfex", "cmhx",
    "sfew", "smew", "sfhw", "smhw",
    "sfex", "smex", "sfhx", "smhx",
]

DEMO_DISPLAY_NAMES = [
    "ずんだもん", "四国めたん", "春日部つむぎ", "雨晴はう",
    "冥鳴ひまり", "九州そら", "中国うさぎ", "もち子さん",
    "青山龍星", "玄野武宏", "白上虎太郎", "後鬼",
]

DEMO_TEXTS = [
    "今日のおすすめごはんある？",
    "一人飯ってどこ行く？",
    "ラーメン：並ぶ派？並ばない派？",
    "コンビニで買いがちなの何？",
    "外食で譲れないポイントある？",
    "このタイプあるある教えて！",
    "最近当たりだった店ある？",
    "自炊するとしたら何作る？",
    "辛いの好き？苦手？",
    "デート飯、アリ？ナシ？",
    "最近このタイプ多くない？",
    "みんなはどう思う？",
    "このタイプ同士だと話しやすい気がする",
]

# 文章末尾
TAILS = ["", "！", "〜", "笑", "？", "…", "！🔥"]


def pick_text():
    return random.choice(DEMO_TEXTS) + random.choice(TAILS)


class Command(BaseCommand):
    help = "Create demo users and demo posts for board.models.Post (complete)"

    def add_arguments(self, parser):
        parser.add_argument("--users", type=int, default=12)
        parser.add_argument("--posts", type=int, default=200)
        parser.add_argument("--prefix", type=str, default="demo_")
        parser.add_argument("--password", type=str, default="demo1234")

        # 投稿をばら撒くタイプ
        parser.add_argument(
            "--types",
            type=str,
            default=",".join(DEFAULT_TYPES),
            help="Comma-separated type list (e.g. cfew,cmhw,smew)",
        )

        # 何日前まで遡って投稿日時を散らすか（自然さUP）
        parser.add_argument("--days", type=int, default=30)

        # 既存デモ投稿/デモユーザーを消して作り直す
        parser.add_argument("--wipe", action="store_true")

    def handle(self, *args, **opts):
        users_n = opts["users"]
        posts_n = opts["posts"]
        prefix = opts["prefix"]
        password = opts["password"]
        days = opts["days"]
        types = [t.strip() for t in opts["types"].split(",") if t.strip()]

        Post = apps.get_model("board", "Post")

        # Profile更新（nickname / food_type）
        Profile = None
        try:
            Profile = apps.get_model("accounts", "Profile")
        except Exception:
            Profile = None

        # --- Post fields auto detect ---
        field_names = {f.name for f in Post._meta.fields}

        # 本文フィールド
        for candidate in ("text", "content", "body", "message"):
            if candidate in field_names:
                text_field = candidate
                break
        else:
            raise RuntimeError(f"Post text field not found. fields={sorted(field_names)}")

        # typeフィールド（タイプ別掲示板用）
        type_field = "type" if "type" in field_names else None

        # created_at / created
        created_field = None
        for cand in ("created_at", "created", "created_on"):
            if cand in field_names:
                created_field = cand
                break

        # --- wipe (optional) ---
        if opts["wipe"]:
            # demo user を探す
            demo_users_qs = User.objects.filter(username__startswith=prefix)
            demo_user_ids = list(demo_users_qs.values_list("id", flat=True))

            # demo投稿を削除
            if demo_user_ids:
                deleted = Post.objects.filter(user_id__in=demo_user_ids).delete()
                self.stdout.write(self.style.WARNING(f"🧹 Deleted demo posts: {deleted}"))

            # demo_users_qs.delete()

        # --- create/update demo users ---
        demo_users = []
        for i in range(users_n):
            display = DEMO_DISPLAY_NAMES[i % len(DEMO_DISPLAY_NAMES)]
            username = f"{prefix}{i+1:02d}" 

            u, created = User.objects.get_or_create(
                username=username,
                defaults={"first_name": display},
            )
            if created:
                u.set_password(password)
                u.save()
            else:
                # 表示名だけ最新化
                if u.first_name != display:
                    u.first_name = display
                    u.save()

            if Profile is not None:
                p, _ = Profile.objects.get_or_create(user=u)
                p.nickname = display
                # food_type も適当に割り当て
                if hasattr(p, "food_type"):
                    p.food_type = random.choice(types) if types else p.food_type
                p.save()

            demo_users.append(u)

        # --- create demo posts ---
        now = timezone.now()
        for _ in range(posts_n):
            u = random.choice(demo_users)
            text = pick_text()

            kwargs = {"user": u, text_field: text}

            # type がある場合は必ず付ける
            if type_field:
                kwargs[type_field] = random.choice(types) if types else random.choice(DEFAULT_TYPES)

            # 日時ランダム
            if created_field:
                back_minutes = random.randint(0, days * 24 * 60)
                kwargs[created_field] = now - timedelta(minutes=back_minutes)

            Post.objects.create(**kwargs)

        self.stdout.write(self.style.SUCCESS(
            f"✅ Done: demo users={users_n}, demo posts={posts_n}, "
            f"text_field={text_field}, type_field={type_field}, created_field={created_field}, days={days}"
        ))
