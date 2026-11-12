from rest_framework import serializers
from .models import Kitab, QuranWord, LughatEntry, AyahTranslation, AyahTafsir


class KitabSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kitab
        fields = ['id', 'name_arabic', 'name_bangla', 'slug', 'category', 'author', 'description', 'sort_order']


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
    kitab_slug = serializers.CharField(source='kitab.slug', read_only=True)

    class Meta:
        model = AyahTranslation
        fields = ['id', 'kitab', 'kitab_name_bangla', 'kitab_slug', 'surah', 'ayah', 'translation_text']


class AyahTafsirSerializer(serializers.ModelSerializer):
    kitab_name_bangla = serializers.CharField(source='kitab.name_bangla', read_only=True)
    kitab_name_arabic = serializers.CharField(source='kitab.name_arabic', read_only=True)
    kitab_slug = serializers.CharField(source='kitab.slug', read_only=True)

    class Meta:
        model = AyahTafsir
        fields = ['id', 'kitab', 'kitab_name_bangla', 'kitab_name_arabic', 'kitab_slug', 'surah', 'ayah', 'tafsir_text']
