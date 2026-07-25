import os
from django.http import JsonResponse
from django.urls import path, include
from django.contrib import admin
from minio import Minio
from minio.error import S3Error
from psycopg import connect
from psycopg.rows import dict_row


def home(request):
    return JsonResponse({'message': 'assunnah backend is running'})


def health(request):
    db_status = {'status': 'unknown'}
    minio_status = {'status': 'unknown'}

    try:
        with connect(
            dbname=os.getenv('POSTGRES_DB', 'assunnah'),
            user=os.getenv('POSTGRES_USER', 'postgres'),
            password=os.getenv('POSTGRES_PASSWORD', 'postgrespassword'),
            host=os.getenv('POSTGRES_HOST', 'postgres'),
            port=os.getenv('POSTGRES_PORT', '5432'),
            row_factory=dict_row,
        ) as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT 1 AS status')
                db_status = cur.fetchone()
    except Exception as exc:
        db_status = {'status': 'failed', 'detail': str(exc)}

    try:
        client = Minio(
            os.getenv('MINIO_ENDPOINT', 'minio:9000'),
            access_key=os.getenv('MINIO_ACCESS_KEY', ''),
            secret_key=os.getenv('MINIO_SECRET_KEY', ''),
            secure=False,
        )
        if not client.bucket_exists(os.getenv('MINIO_BUCKET', 'media')):
            client.make_bucket(os.getenv('MINIO_BUCKET', 'media'))
        minio_status = {
            'bucket': os.getenv('MINIO_BUCKET', 'media'),
            'endpoint': os.getenv('MINIO_ENDPOINT', 'minio:9000'),
        }
    except S3Error as exc:
        minio_status = {'status': 'failed', 'detail': str(exc)}

    return JsonResponse({'status': 'ok', 'database': db_status, 'minio': minio_status})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('', home, name='home'),
    path('health/', health, name='health'),
]
