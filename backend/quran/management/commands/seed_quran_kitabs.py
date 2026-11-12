from django.core.management.base import BaseCommand
from quran.models import Kitab, KitabCategory, QuranWord, LughatEntry, AyahTranslation, AyahTafsir


class Command(BaseCommand):
    help = 'Seeds initial Quran study Kitabs, roots, lughat entries (Al-Mu\'jam al-Waseet), translations, and tafsirs.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding Quran kitabs...")

        kitabs_data = [
            # Lughat
            {
                "name_arabic": "المعجم الوسيط",
                "name_bangla": "আল-মু'জামুল ওয়াসীত",
                "slug": "al-mujam-al-waseet",
                "category": KitabCategory.LUGHAT,
                "author": "مجمع اللغة العربية بالقاهرة (ইবরাহীম মুস্তাফা ও সঙ্গীবৃন্দ)",
                "description": "আধুনিক ও প্রাচীন আরবি সাহিত্যের সবচেয়ে প্রামাণ্য ও বহুল ব্যবহৃত সর্বজনগ্রাহ্য আরবি অভিধান।",
                "sort_order": 1,
            },
            {
                "name_arabic": "المفردات في غريب القرآن",
                "name_bangla": "আল-মুফরাদাত ফী গারীবিল কুরআন",
                "slug": "al-mufradat",
                "category": KitabCategory.LUGHAT,
                "author": "الراغب الأصفهاني (রাগেব ইসফাহানী)",
                "description": "কুরআনের বিশেষ শব্দাবলীর গভীর শাব্দিক তাহকীক ও ব্যুৎপত্তিগত প্রামাণ্য গ্রন্থ।",
                "sort_order": 2,
            },
            # Tafsir
            {
                "name_arabic": "التفسير الميسر",
                "name_bangla": "আত-তাফসীরুল মুয়াসসার",
                "slug": "tafsir-muyassar",
                "category": KitabCategory.TAFSIR,
                "author": "مجمع الملك فهد لطباعة المصحف الشريف",
                "description": "সহজ, সরল ও নির্ভরযোগ্য সংক্ষিপ্ত তাফসীর।",
                "sort_order": 1,
            },
            {
                "name_arabic": "تفسير الجلالين",
                "name_bangla": "তাফসীরে জালালাইন",
                "slug": "tafsir-jalalayn",
                "category": KitabCategory.TAFSIR,
                "author": "الإمام جلال الدين المحلي والإمام جلال الدين السيوطي",
                "description": "দারসে নিজামির পাঠ্যভুক্ত সর্বজনবিদিত সংক্ষিপ্ত অথচ গভীর প্রামাণ্য তাফসীর।",
                "sort_order": 2,
            },
            {
                "name_arabic": "تفسير ابن كثير",
                "name_bangla": "তাফসীরে ইবনে কাসীর",
                "slug": "tafsir-ibn-kathir",
                "category": KitabCategory.TAFSIR,
                "author": "عماد الدين إسماعيل بن كثير الدمشقي",
                "description": "তাফসীর বিল মা'সূর-এর শ্রেষ্ঠতম বিশ্বকোষীয় তাফসীর।",
                "sort_order": 3,
            },
            # Translations
            {
                "name_arabic": "ترجمة مولانا محيي الدين خان",
                "name_bangla": "মাওলানা মহিউদ্দীন খান",
                "slug": "trans-muhiuddin",
                "category": KitabCategory.TRANSLATION,
                "author": "মাওলানা মহিউদ্দীন খান (মারেফুল কুরআন অনুবাদক)",
                "description": "বাংলাদেশ ও উপমহাদেশে সর্বাধিক সমাদৃত বিশুদ্ধ বাংলা অনুবাদ।",
                "sort_order": 1,
            },
            {
                "name_arabic": "ترجمة الدكتور مجيب الرحمن",
                "name_bangla": "ড. মুজিবুর রহমান",
                "slug": "trans-mujibur",
                "category": KitabCategory.TRANSLATION,
                "author": "ড. মুজিবুর রহমান",
                "description": "সহজ ও প্রাঞ্জল নির্ভরযোগ্য অনুবাদ।",
                "sort_order": 2,
            },
            {
                "name_arabic": "تيسير القرآن",
                "name_bangla": "তাইসিরুল কুরআন",
                "slug": "trans-taisirul",
                "category": KitabCategory.TRANSLATION,
                "author": "তাওহীদ পাবলিকেশন্স",
                "description": "বিশুদ্ধ ও সমসাময়িক শব্দশৈলীতে করা সাবলীল অনুবাদ।",
                "sort_order": 3,
            },
        ]

        kitab_objs = {}
        for kd in kitabs_data:
            obj, _ = Kitab.objects.update_or_create(
                slug=kd['slug'],
                defaults=kd
            )
            kitab_objs[kd['slug']] = obj

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(kitab_objs)} Kitabs!"))
