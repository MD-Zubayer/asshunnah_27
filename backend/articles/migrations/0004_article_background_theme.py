from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('articles', '0003_article_embedding_articlereaction_delete_articlelike'),
    ]

    operations = [
        migrations.AddField(
            model_name='article',
            name='background_theme',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Optional Facebook-style background theme key for short posts',
                max_length=50,
                verbose_name='background theme',
            ),
        ),
    ]
