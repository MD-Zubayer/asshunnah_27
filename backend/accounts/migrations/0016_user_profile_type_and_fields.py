from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_dua_audio'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='profile_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('jamia_faregin', 'Jamia Faregin'),
                    ('current_student', 'Current Student'),
                    ('jamia_ustad', 'Jamia Ustad'),
                    ('general_user', 'General User'),
                    ('takmil_student', 'Takmil Student'),
                    ('non_takmil_student', 'Non-Takmil Student'),
                ],
                max_length=30,
                null=True,
                verbose_name='profile type'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='jamat',
            field=models.CharField(blank=True, help_text='Class/Jamat for current students', max_length=100, null=True, verbose_name='jamat'),
        ),
        migrations.AddField(
            model_name='user',
            name='designation',
            field=models.CharField(blank=True, help_text='Designation for Ustads', max_length=150, null=True, verbose_name='designation'),
        ),
        migrations.AddField(
            model_name='user',
            name='department',
            field=models.CharField(blank=True, help_text='Department for Ustads', max_length=150, null=True, verbose_name='department'),
        ),
        migrations.AddField(
            model_name='user',
            name='dakhila_number',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='dakhila number'),
        ),
        migrations.AddField(
            model_name='user',
            name='blood_group',
            field=models.CharField(blank=True, max_length=10, null=True, verbose_name='blood group'),
        ),
        migrations.AddField(
            model_name='user',
            name='occupation',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='occupation'),
        ),
    ]
