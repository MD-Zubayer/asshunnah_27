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
            {
                "name_arabic": "ترجمة الدكتور أبو بكر محمد زكريا",
                "name_bangla": "ড. আবু বকর মুহাম্মাদ যাকারিয়া",
                "slug": "trans-zakaria",
                "category": KitabCategory.TRANSLATION,
                "author": "ড. আবু বকর মুহাম্মাদ যাকারিয়া",
                "publisher": "মجمع الملك فهد لطباعة المصحف الشريف (মদীনা মুনাওয়ারা)",
                "investigator": "বাদশাহ ফাহদ কুরআন মুদ্রণ কমপ্লেক্সের অফিসিয়াল বাংলা সংস্করণ",
                "edition_info": "মদীনা সংস্করণ",
                "total_volumes": 1,
                "description": "বাদশাহ ফাহদ কুরআন মুদ্রণ কমপ্লেক্স কর্তৃক মুদ্রিত অফিশিয়াল প্রামাণ্য অনুবাদ।",
                "sort_order": 4,
            },
            {
                "name_arabic": "روائع البيان في ترجمة معاني القرآن",
                "name_bangla": "রওয়ায়েউল বায়ান",
                "slug": "trans-rawai",
                "category": KitabCategory.TRANSLATION,
                "author": "বায়ান ফাউন্ডেশন অনুবাদ পরিষদ",
                "publisher": "বায়ান ফাউন্ডেশন",
                "investigator": "সম্পাদনা পরিষদ",
                "edition_info": "প্রামাণ্য সংস্করণ",
                "total_volumes": 1,
                "description": "বায়ান ফাউন্ডেশন কর্তৃক প্রকাশিত বিশুদ্ধ ও সাবলীল অনুবাদ।",
                "sort_order": 5,
            },
            {
                "name_arabic": "ترجمة شيخ الهند (تفسير عثماني)",
                "name_bangla": "তাফসীরে উসমানী (শায়খুল হিন্দ)",
                "slug": "trans-tafsir-usmani",
                "category": KitabCategory.TRANSLATION,
                "author": "শায়খুল হিন্দ মাহমুদ হাসান দেওবন্দী ও আল্লামা শাব্বীর আহমদ উসমানী রহ.",
                "publisher": "দারুল উলূম দেওবন্দ / ইসলামিক ফাউন্ডেশন",
                "investigator": "প্রখ্যাত ওলামায়ে কেরাম",
                "edition_info": "দেওবন্দ প্রামাণ্য সংস্করণ",
                "total_volumes": 3,
                "description": "দারুল উলূম দেওবন্দের শ্রেষ্ঠ ঐতিহ্যবাহী ও প্রামাণ্য তরজমা।",
                "sort_order": 6,
            },
            {
                "name_arabic": "ترجمة المؤسسة الإسلامية بنغلاديش",
                "name_bangla": "ইসলামিক ফাউন্ডেশন",
                "slug": "trans-islamic-foundation",
                "category": KitabCategory.TRANSLATION,
                "author": "ইসলামিক ফাউন্ডেশন অনুবাদক পরিষদ",
                "publisher": "ইসলামিক ফাউন্ডেশন, বায়তুল মোকাররম, ঢাকা",
                "investigator": "জাতীয় অনুবাদক বোর্ড",
                "edition_info": "জাতীয় সংস্করণ",
                "total_volumes": 1,
                "description": "বাংলাদেশের জাতীয় প্রামাণ্য সরকারি অনুবাদ।",
                "sort_order": 7,
            },
        ]

        kitab_objs = {}
        valid_fields = {'name_arabic', 'name_bangla', 'slug', 'category', 'author', 'description', 'sort_order'}
        for kd in kitabs_data:
            clean_defaults = {k: v for k, v in kd.items() if k in valid_fields}
            obj, _ = Kitab.objects.update_or_create(
                slug=kd['slug'],
                defaults=clean_defaults
            )
            kitab_objs[kd['slug']] = obj

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(kitab_objs)} Kitabs!"))
