import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from minio import Minio
from minio.error import S3Error
from pydantic import BaseSettings
from psycopg import connect
from psycopg.rows import dict_row


class Settings(BaseSettings):
    database_url: str
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str

    class Config:
        env_file = '.env'


settings = Settings()
app = FastAPI(title='assunnah-backend')


def get_db_status():
    try:
        with connect(settings.database_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT 1 AS status')
                return cur.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Database connection failed: {exc}')


def get_minio_status():
    client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
    )
    try:
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)
        return {'bucket': settings.minio_bucket, 'endpoint': settings.minio_endpoint}
    except S3Error as exc:
        raise HTTPException(status_code=500, detail=f'Minio connection failed: {exc}')


@app.get('/')
def read_root():
    return {'message': 'assunnah backend is running'}


@app.get('/health')
def health_check(db_status: dict = Depends(get_db_status), minio_status: dict = Depends(get_minio_status)):
    return {
        'database': db_status,
        'minio': minio_status,
        'status': 'ok',
    }
