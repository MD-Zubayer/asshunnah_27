from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0016_user_profile_type_and_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='diary',
            name='entry_date',
            field=models.DateField(blank=True, null=True, verbose_name='entry date'),
        ),
        migrations.AddField(
            model_name='diary',
            name='hijri_date',
            field=models.CharField(blank=True, default='', max_length=100, verbose_name='hijri date'),
        ),
        migrations.AddField(
            model_name='diary',
            name='mood',
            field=models.CharField(blank=True, default='', max_length=50, verbose_name='mood'),
        ),
        migrations.AddField(
            model_name='diary',
            name='weather',
            field=models.CharField(blank=True, default='', max_length=50, verbose_name='weather'),
        ),
        migrations.AddField(
            model_name='diary',
            name='paper_theme',
            field=models.CharField(blank=True, default='cream', max_length=30, verbose_name='paper theme'),
        ),
        migrations.AddField(
            model_name='diary',
            name='font_family',
            field=models.CharField(blank=True, default='handwriting', max_length=40, verbose_name='font family'),
        ),
        migrations.AddField(
            model_name='diary',
            name='is_pinned',
            field=models.BooleanField(default=False, verbose_name='is pinned'),
        ),
        migrations.AddField(
            model_name='diary',
            name='page_number',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='page number'),
        ),
    ]
