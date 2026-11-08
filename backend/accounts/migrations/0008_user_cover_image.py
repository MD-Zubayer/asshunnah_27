# Generated manually for cover_image field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_devicetoken_globalprayeralertconfig_prayeralertlog_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='cover_image',
            field=models.ImageField(blank=True, null=True, upload_to='covers/', verbose_name='cover image'),
        ),
    ]