from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Kitab, QuranWord, LughatEntry, AyahTranslation, AyahTafsir, KitabCategory
from .serializers import (
    KitabSerializer,
    QuranWordSerializer,
    LughatEntrySerializer,
    AyahTranslationSerializer,
    AyahTafsirSerializer,
)
from .lexicon_service import lookup_lexicon


class KitabListView(APIView):
    """
    List all active kitabs (Lughat, Tafsir, Translation)
    Optional query param: ?category=LUGHAT | TAFSIR | TRANSLATION
    """
    def get(self, request):
        category = request.query_params.get('category', '').upper()
        queryset = Kitab.objects.filter(is_active=True)
        if category in [c.value for c in KitabCategory]:
            queryset = queryset.filter(category=category)
        serializer = KitabSerializer(queryset, many=True)
        return Response(serializer.data)


class WordLughatView(APIView):
    """
    Returns authentic word morphological breakdown and real dictionary entries from:
    1. Al-Mu'jam al-Waseet (المعجم الوسيط)
    2. Al-Mufradat fi Gharib al-Quran (المفردات للراغب الأصفهاني)
    """
    def get(self, request):
        surah = request.query_params.get('surah')
        ayah = request.query_params.get('ayah')
        position = request.query_params.get('position')
        root_query = request.query_params.get('root', '').strip()
        kitab_slug = request.query_params.get('kitab_slug', '').strip()

        word_obj = None
        target_root = root_query

        if surah and ayah and position:
            try:
                word_obj = QuranWord.objects.filter(
                    surah=int(surah),
                    ayah=int(ayah),
                    position=int(position)
                ).first()
                if word_obj and word_obj.root:
                    target_root = word_obj.root
            except (ValueError, TypeError):
                pass

        if not target_root:
            return Response(
                {"detail": "Neither root nor valid word coordinates provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Normalize root (remove spaces if searching)
        clean_root = target_root.replace(" ", "")

        entries = []

        # 1. Query authentic lexicons.sqlite for Al-Mu'jam al-Waseet
        if not kitab_slug or kitab_slug == 'al-mujam-al-waseet':
            waseet = lookup_lexicon(clean_root, 'al-mujam-al-waseet')
            if waseet:
                entries.append({
                    "id": 1,
                    "kitab": 1,
                    "kitab_name_arabic": "المعجم الوسيط",
                    "kitab_name_bangla": "আল-মু'জামুল ওয়াসীত",
                    "kitab_slug": "al-mujam-al-waseet",
                    "root": clean_root,
                    "title": f"جذر ({waseet['root']})",
                    "content": waseet['content'],
                })

        # 2. Query authentic lexicons.sqlite for Al-Mufradat (Raghib al-Isfahani)
        if not kitab_slug or kitab_slug == 'al-mufradat':
            mufradat = lookup_lexicon(clean_root, 'al-mufradat')
            if mufradat:
                entries.append({
                    "id": 2,
                    "kitab": 2,
                    "kitab_name_arabic": "المفردات في غريب القرآن",
                    "kitab_name_bangla": "আল-মুফরাদাত ফী গারীবিল কুরআন",
                    "kitab_slug": "al-mufradat",
                    "root": clean_root,
                    "title": f"مفردات ({mufradat['root']})",
                    "content": mufradat['content'],
                })

        # 3. If also present in Django database LughatEntry, append
        db_entries = LughatEntry.objects.filter(
            kitab__is_active=True,
            kitab__category=KitabCategory.LUGHAT,
            root__in=[clean_root, " ".join(list(clean_root))]
        ).select_related('kitab')
        if db_entries.exists():
            entries.extend(LughatEntrySerializer(db_entries, many=True).data)

        data = {
            "root": clean_root,
            "word": QuranWordSerializer(word_obj).data if word_obj else None,
            "entries": entries
        }
        return Response(data)


class AyahStudyView(APIView):
    """
    Returns full study details for a given Ayah:
    - Translations (from all active translation kitabs)
    - Tafsirs (from all active tafsir kitabs)
    - Words in the Ayah with their individual roots
    """
    def get(self, request):
        surah = request.query_params.get('surah')
        ayah = request.query_params.get('ayah')

        if not surah or not ayah:
            return Response({"detail": "surah and ayah query parameters are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            surah_num = int(surah)
            ayah_num = int(ayah)
        except ValueError:
            return Response({"detail": "surah and ayah must be integers."}, status=status.HTTP_400_BAD_REQUEST)

        translations = AyahTranslation.objects.filter(
            surah=surah_num,
            ayah=ayah_num,
            kitab__is_active=True
        ).select_related('kitab')

        tafsirs = AyahTafsir.objects.filter(
            surah=surah_num,
            ayah=ayah_num,
            kitab__is_active=True
        ).select_related('kitab')

        words = QuranWord.objects.filter(
            surah=surah_num,
            ayah=ayah_num
        ).order_by('position')

        return Response({
            "surah": surah_num,
            "ayah": ayah_num,
            "words": QuranWordSerializer(words, many=True).data,
            "translations": AyahTranslationSerializer(translations, many=True).data,
            "tafsirs": AyahTafsirSerializer(tafsirs, many=True).data,
        })
