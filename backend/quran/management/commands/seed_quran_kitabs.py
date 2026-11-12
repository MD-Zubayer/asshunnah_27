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
                "author": "مجمع اللغة العربية بالقاهرة",
                "publisher": "مكتبة الشروق الدولية (القاهرة)",
                "investigator": "إبراهيم مصطفى، أحمد حسن الزيات، حامد عبد القادر، محمد علي النجار",
                "edition_info": "الطبعة الرابعة، 1425 هـ / 2004 م",
                "total_volumes": 2,
                "description": "আধুনিক ও প্রাচীন আরবি সাহিত্যের সবচেয়ে প্রামাণ্য ও বহুল ব্যবহৃত সর্বজনগ্রাহ্য আরবি অভিধান।",
                "sort_order": 1,
            },
            {
                "name_arabic": "المفردات في غريب القرآن",
                "name_bangla": "আল-মুফরাদাত ফী গারীবিল কুরআন",
                "slug": "al-mufradat",
                "category": KitabCategory.LUGHAT,
                "author": "أبو القاسم الحسين بن محمد (الراغب الأصفهاني)",
                "publisher": "دار القلم (دمشق) - الدار الشامية (بيروت)",
                "investigator": "صفوان عدنان داوودي",
                "edition_info": "الطبعة الأولى، 1412 هـ / 1992 م",
                "total_volumes": 1,
                "description": "কুরআনের বিশেষ শব্দাবলীর গভীর শাব্দিক তাহকীক ও ব্যুৎপত্তিগত প্রামাণ্য গ্রন্থ।",
                "sort_order": 2,
            },
            # Tafsir
            {
                "name_arabic": "التفسير الميسر",
                "name_bangla": "আত-তাফসীরুল মুয়াসসার",
                "slug": "tafsir-muyassar",
                "category": KitabCategory.TAFSIR,
                "author": "نخبة من أساتذة التفسير",
                "publisher": "مجمع الملك فهد لطباعة المصحف الشريف (المدينة المنورة)",
                "investigator": "إشراف: وزارة الشؤون الإسلامية والأوقاف والدعوة والإرشاد",
                "edition_info": "الطبعة الثالثة، 1430 هـ / 2009 م",
                "total_volumes": 1,
                "description": "সহজ, সরল ও নির্ভরযোগ্য সংক্ষিপ্ত তাফসীর।",
                "sort_order": 1,
            },
            {
                "name_arabic": "تفسير الجلالين",
                "name_bangla": "তাফসীরে জালালাইন",
                "slug": "tafsir-jalalayn",
                "category": KitabCategory.TAFSIR,
                "author": "جلال الدين المحلي وجلال الدين السيوطي",
                "publisher": "دار المعرفة (بيروت) / مكتبة الإمدادية",
                "investigator": "طبعة مصححة ومفهرسة مع أسباب النزول",
                "edition_info": "طبعة جديدة مخرجة الأحاديث",
                "total_volumes": 1,
                "description": "দারসে নিজামির পাঠ্যভুক্ত সর্বজনবিদিত সংক্ষিপ্ত অথচ গভীর প্রামাণ্য তাফসীর।",
                "sort_order": 2,
            },
            {
                "name_arabic": "تفسير القرآن العظيم (ابن كثير)",
                "name_bangla": "তাফসীরে ইবনে কাসীর",
                "slug": "tafsir-ibn-kathir",
                "category": KitabCategory.TAFSIR,
                "author": "عماد الدين إسماعيل بن عمر بن كثير القرشي الدمشقي",
                "publisher": "دار طيبة للنشر والتوزيع (الرياض)",
                "investigator": "أ.د. سامي بن محمد السلامة",
                "edition_info": "الطبعة الثانية، 1420 هـ / 1999 م",
                "total_volumes": 8,
                "description": "তাফসীর বিল মা'সূর-এর শ্রেষ্ঠতম বিশ্বকোষীয় তাফসীর।",
                "sort_order": 3,
            },
            # Translations
            {
                "name_arabic": "ترجمة معارف القرآن",
                "name_bangla": "মাওলানা মহিউদ্দীন খান",
                "slug": "trans-muhiuddin",
                "category": KitabCategory.TRANSLATION,
                "author": "অনুবাদ ও সম্পাদনা: মাওলানা মুহিউদ্দীন খান",
                "publisher": "মদিনা পাবলিকেশন্স / ইসলামিক ফাউন্ডেশন বাংলাদেশ",
                "investigator": "মাওলানা মুহাম্মদ শফী রহ.-এর মূল তাফসীরে মা'আরিফুল কুরআন সংক্ষেপিত অনুবাদ",
                "edition_info": "৮ খণ্ড প্রামাণ্য মুদ্রণ সংস্করণ",
                "total_volumes": 8,
                "description": "বাংলাদেশ ও উপমহাদেশে সর্বাধিক সমাদৃত বিশুদ্ধ বাংলা অনুবাদ।",
                "sort_order": 1,
            },
            {
                "name_arabic": "ترجمة الدكتور مجيب الرحمن",
                "name_bangla": "ড. মুজিবুর রহমান",
                "slug": "trans-mujibur",
                "category": KitabCategory.TRANSLATION,
                "author": "ড. মুজিবুর রহমান (সাবেক অধ্যাপক, রাজশাহী বিশ্ববিদ্যালয়)",
                "publisher": "দারুস সালাম / বাংলাদেশ ইসলামিক সেন্টার",
                "investigator": "শাইখ সফিউর রহমান মুবারকপুরী রহ. কর্তৃক অনুমোদিত সংস্করণ",
                "edition_info": "প্রামাণ্য সংস্করণ",
                "total_volumes": 1,
                "description": "সহজ ও প্রাঞ্জল নির্ভরযোগ্য অনুবাদ।",
                "sort_order": 2,
            },
            {
                "name_arabic": "تيسير القرآن",
                "name_bangla": "তাইসিরুল কুরআন",
                "slug": "trans-taisirul",
                "category": KitabCategory.TRANSLATION,
                "author": "তাওহীদ পাবলিকেশন্স অনুবাদ পর্ষদ",
                "publisher": "তাওহীদ পাবলিকেশন্স, ঢাকা",
                "investigator": "আখতারুজ্জামান মুহাম্মাদ সুলাইমান ও সম্পাদনা পরিষদ",
                "edition_info": "পরিমার্জিত সংস্করণ",
                "total_volumes": 1,
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
