from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_user_bio'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='fuzalaye_jamia_name',
            field=models.CharField(
                blank=True,
                help_text='Exact name from Fuzalaye Jamia list, used to link user profile',
                max_length=255,
                null=True,
                unique=True,
                verbose_name='fuzalaye jamia name',
            ),
        ),
    ]