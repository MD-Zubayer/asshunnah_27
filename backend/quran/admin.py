from django.contrib import admin
from .models import Kitab, QuranWord, LughatEntry, AyahTranslation, AyahTafsir


@admin.register(Kitab)
class KitabAdmin(admin.ModelAdmin):
    list_display = ['name_bangla', 'name_arabic', 'category', 'is_active', 'sort_order']
    list_filter = ['category', 'is_active']
    search_fields = ['name_bangla', 'name_arabic', 'author']
    prepopulated_fields = {'slug': ('name_arabic',)}


@admin.register(QuranWord)
class QuranWordAdmin(admin.ModelAdmin):
    list_display = ['surah', 'ayah', 'position', 'word_arabic', 'root', 'lemma']
    list_filter = ['surah']
    search_fields = ['word_arabic', 'root', 'lemma']


@admin.register(LughatEntry)
class LughatEntryAdmin(admin.ModelAdmin):
    list_display = ['root', 'kitab', 'title']
    list_filter = ['kitab']
    search_fields = ['root', 'title', 'content']


@admin.register(AyahTranslation)
class AyahTranslationAdmin(admin.ModelAdmin):
    list_display = ['surah', 'ayah', 'kitab']
    list_filter = ['kitab', 'surah']
    search_fields = ['translation_text']


@admin.register(AyahTafsir)
class AyahTafsirAdmin(admin.ModelAdmin):
    list_display = ['surah', 'ayah', 'kitab']
    list_filter = ['kitab', 'surah']
    search_fields = ['tafsir_text']
