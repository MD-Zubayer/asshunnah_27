from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Kitab, QuranWord, LughatEntry, AyahTranslation, AyahTafsir, KitabCategory
from .serializers import (
    KitabSerializer,
    QuranWordSerializer,
    LughatEntrySerializer,
    AyahTranslationSerializer,
    AyahTafsirSerializer,
)
from .lexicon_service import lookup_lexicon
from .sync_service import ensure_ayah_study_data


class KitabListView(APIView):
    permission_classes = [AllowAny]
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
    permission_classes = [AllowAny]
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
        kitab_slug = (request.query_params.get('kitab_slug') or request.query_params.get('kitab') or '').strip()

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

        lexicon_catalog = [
            ("al-mujam-al-waseet", 1, "المعجم الوسيط", "আল-মু'জামুল ওয়াসীত"),
            ("al-mufradat", 2, "المفردات في غريب القرآن", "আল-মুফরাদাত ফী গারীবিল কুরআন"),
            ("maqayis-al-lughah", 13, "معجم مقاييس اللغة", "মু'জামু মাকায়ীসিল লুগাহ"),
            ("lisan-al-arab", 15, "لسان العرب", "লিসানুল আরব"),
            ("al-qamus-al-muhit", 16, "القاموس المحيط", "আল-কামূসুল মুহীত"),
            ("as-sihah", 17, "الصحاح تاج اللغة", "আস-সিহাহ (তাজুল লুগাহ)"),
        ]

        target_slugs = [kitab_slug] if kitab_slug else [c[0] for c in lexicon_catalog]

        for slug, k_id, name_ar, name_bn in lexicon_catalog:
            if slug in target_slugs:
                res = lookup_lexicon(clean_root, slug)
                if res:
                    entries.append({
                        "id": k_id,
                        "kitab": k_id,
                        "kitab_name_arabic": name_ar,
                        "kitab_name_bangla": name_bn,
                        "kitab_slug": slug,
                        "root": clean_root,
                        "title": f"({res['root']})",
                        "content": res['content'],
                    })

        # Query Django database LughatEntry if any exist
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
    permission_classes = [AllowAny]
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

        # Auto-populate missing translations & tafsirs into the PostgreSQL DB (Write-Through Cache)
        try:
            ensure_ayah_study_data(surah_num, ayah_num)
        except Exception as _sync_err:
            pass

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
