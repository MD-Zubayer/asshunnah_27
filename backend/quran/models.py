from django.db import models


class KitabCategory(models.TextChoices):
    LUGHAT = 'LUGHAT', 'Arabic Lughat'
    TAFSIR = 'TAFSIR', 'Tafsir'
    TRANSLATION = 'TRANSLATION', 'Translation'


class Kitab(models.Model):
    name_arabic = models.CharField(max_length=150, help_text="e.g. المعجم الوسيط")
    name_bangla = models.CharField(max_length=150, help_text="e.g. আল-মু'জামুল ওয়াসীত")
    slug = models.SlugField(max_length=100, unique=True, help_text="e.g. al-mujam-al-waseet")
    category = models.CharField(max_length=20, choices=KitabCategory.choices, db_index=True)
    author = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    publisher = models.CharField(max_length=200, blank=True, help_text="প্রকাশনী (e.g. دار طيبة للنشر والتوزيع)")
    investigator = models.CharField(max_length=200, blank=True, help_text="মুহাক্কিক / তাহকীককারী (e.g. د. سامي السلامة)")
    edition_info = models.CharField(max_length=150, blank=True, help_text="সংস্করণ ও সন (e.g. الطبعة الثانية، 1420 هـ / 1999 م)")
    total_volumes = models.PositiveSmallIntegerField(default=1, help_text="মোট খণ্ড সংখ্যা")
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'id']
        verbose_name = 'Kitab'
        verbose_name_plural = 'Kitabs'

    def __str__(self):
        return f"{self.name_bangla} ({self.get_category_display()})"


class QuranWord(models.Model):
    surah = models.PositiveSmallIntegerField(db_index=True)
    ayah = models.PositiveSmallIntegerField(db_index=True)
    position = models.PositiveSmallIntegerField()
    word_arabic = models.CharField(max_length=100)
    root = models.CharField(max_length=50, blank=True, db_index=True)
    lemma = models.CharField(max_length=100, blank=True)
    grammar_details = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['surah', 'ayah', 'position']
        unique_together = ('surah', 'ayah', 'position')
        verbose_name = 'Quran Word'
        verbose_name_plural = 'Quran Words'

    def __str__(self):
        return f"{self.surah}:{self.ayah}:{self.position} - {self.word_arabic} (Root: {self.root})"


class LughatEntry(models.Model):
    kitab = models.ForeignKey(Kitab, on_delete=models.CASCADE, related_name='lughat_entries')
    root = models.CharField(max_length=50, db_index=True, help_text="e.g. غفر or ك ت ب")
    title = models.CharField(max_length=150, blank=True)
    content = models.TextField(help_text="Detailed Arabic definition and lexical breakdown")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('kitab', 'root')
        verbose_name = 'Lughat Entry'
        verbose_name_plural = 'Lughat Entries'

    def __str__(self):
        return f"[{self.kitab.name_arabic}] الجذر: {self.root}"


class AyahTranslation(models.Model):
    kitab = models.ForeignKey(Kitab, on_delete=models.CASCADE, related_name='translations')
    surah = models.PositiveSmallIntegerField(db_index=True)
    ayah = models.PositiveSmallIntegerField(db_index=True)
    translation_text = models.TextField()
    volume_number = models.PositiveSmallIntegerField(null=True, blank=True, help_text="খণ্ড নম্বর")
    page_number = models.PositiveIntegerField(null=True, blank=True, help_text="পৃষ্ঠা নম্বর")

    class Meta:
        unique_together = ('kitab', 'surah', 'ayah')
        verbose_name = 'Ayah Translation'
        verbose_name_plural = 'Ayah Translations'

    def __str__(self):
        return f"[{self.kitab.name_bangla}] {self.surah}:{self.ayah}"


class AyahTafsir(models.Model):
    kitab = models.ForeignKey(Kitab, on_delete=models.CASCADE, related_name='tafsirs')
    surah = models.PositiveSmallIntegerField(db_index=True)
    ayah = models.PositiveSmallIntegerField(db_index=True)
    tafsir_text = models.TextField()
    volume_number = models.PositiveSmallIntegerField(null=True, blank=True, help_text="খণ্ড নম্বর")
    page_number = models.PositiveIntegerField(null=True, blank=True, help_text="পৃষ্ঠা নম্বর")
    edition_reference = models.CharField(max_length=255, blank=True, help_text="মুদ্রণ ও পৃষ্ঠা রেফারেন্স")

    class Meta:
        unique_together = ('kitab', 'surah', 'ayah')
        verbose_name = 'Ayah Tafsir'
        verbose_name_plural = 'Ayah Tafsirs'

    def __str__(self):
        return f"[{self.kitab.name_bangla}] {self.surah}:{self.ayah}"
