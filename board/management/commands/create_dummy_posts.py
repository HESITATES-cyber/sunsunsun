from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from board.models import Post
import random


class Command(BaseCommand):
    help = "ダミーユーザーとダミー投稿を作成する（nickname付き）"

    def handle(self, *args, **kwargs):

        # -----------------------
        # ① ダミーユーザー作成
        # -----------------------
        usernames = [
            "taro", "hana", "ken", "misaki",
            "ryo", "yui", "sora", "ao"
        ]

        nicknames = [
            "にこ", "ぽん", "そら", "るな", "ひかる",
            "あお", "りん", "まい", "けん", "たろう"
        ]

        users = []

        for name in usernames:
            # nickname をランダムに付与
            user, created = User.objects.get_or_create(
                username=name,
                defaults={
                    "password": "dummy_password",
                    "first_name": random.choice(nicknames)  # nickname として利用
                }
            )
            users.append(user)

        # -----------------------
        # ② 投稿本文
        # -----------------------
        texts = [
            "このタイプ同士だと話しやすい気がする",
            "診断結果、意外だった",
            "みんなはどう思う？",
            "最近このタイプ多くない？",
            "初投稿です！"
        ]

        # -----------------------
        # ③ タイプ（choicesと一致させる）
        # -----------------------
        types = [
            "cfew","cmhw","cmew","cfhw",
            "cfhx","cmex","cfex","cmhx",
            "sfew","smew","sfhw","smhw",
            "sfex","smex","sfhx","smhx"
        ]

        # -----------------------
        # ④ ダミー投稿作成
        # -----------------------
        for t in types:
            for _ in range(5):  # 各タイプ5件
                Post.objects.create(
                    user=random.choice(users),
                    type=t,
                    text=random.choice(texts)
                )

        self.stdout.write(
            self.style.SUCCESS("ダミーユーザー＆投稿を作成しました（nickname付き）")
        )
