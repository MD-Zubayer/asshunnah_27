from rest_framework import serializers
from .models import Kitab, QuranWord, LughatEntry, AyahTranslation, AyahTafsir


class KitabSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kitab
        fields = [
            'id', 'name_arabic', 'name_bangla', 'slug', 'category',
            'author', 'description', 'publisher', 'investigator',
            'edition_info', 'total_volumes', 'sort_order'
        ]


class QuranWordSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuranWord
        fields = ['surah', 'ayah', 'position', 'word_arabic', 'root', 'lemma', 'grammar_details']


class LughatEntrySerializer(serializers.ModelSerializer):
    kitab_name_arabic = serializers.CharField(source='kitab.name_arabic', read_only=True)
    kitab_name_bangla = serializers.CharField(source='kitab.name_bangla', read_only=True)
    kitab_slug = serializers.CharField(source='kitab.slug', read_only=True)

    class Meta:
        model = LughatEntry
        fields = ['id', 'kitab', 'kitab_name_arabic', 'kitab_name_bangla', 'kitab_slug', 'root', 'title', 'content']


class AyahTranslationSerializer(serializers.ModelSerializer):
    kitab_name_bangla = serializers.CharField(source='kitab.name_bangla', read_only=True)
    kitab_name_arabic = serializers.CharField(source='kitab.name_arabic', read_only=True)
    kitab_slug = serializers.CharField(source='kitab.slug', read_only=True)
    kitab_publisher = serializers.CharField(source='kitab.publisher', read_only=True)
    kitab_edition = serializers.CharField(source='kitab.edition_info', read_only=True)

    class Meta:
        model = AyahTranslation
        fields = [
            'id', 'kitab', 'kitab_name_bangla', 'kitab_name_arabic', 'kitab_slug',
            'kitab_publisher', 'kitab_edition', 'surah', 'ayah',
            'translation_text', 'volume_number', 'page_number'
        ]


class AyahTafsirSerializer(serializers.ModelSerializer):
    kitab_name_bangla = serializers.CharField(source='kitab.name_bangla', read_only=True)
    kitab_name_arabic = serializers.CharField(source='kitab.name_arabic', read_only=True)
    kitab_slug = serializers.CharField(source='kitab.slug', read_only=True)
    kitab_publisher = serializers.CharField(source='kitab.publisher', read_only=True)
    kitab_investigator = serializers.CharField(source='kitab.investigator', read_only=True)
    kitab_edition = serializers.CharField(source='kitab.edition_info', read_only=True)

    class Meta:
        model = AyahTafsir
        fields = [
            'id', 'kitab', 'kitab_name_bangla', 'kitab_name_arabic', 'kitab_slug',
            'kitab_publisher', 'kitab_investigator', 'kitab_edition', 'surah', 'ayah',
            'tafsir_text', 'volume_number', 'page_number', 'edition_reference'
        ]
