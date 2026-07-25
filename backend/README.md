# Backend Docker Setup

This backend stack uses Docker Compose to run:
- Python Django backend
- PostgreSQL database
- MinIO object storage
- Cloudflare tunnel via `cloudflared`

## Setup

1. Copy environment template:

```bash
cd backend
cp .env.example .env
```

2. Fill in `.env` values:
- `POSTGRES_PASSWORD`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `CLOUDFLARED_TUNNEL_TOKEN`
- `DJANGO_SECRET_KEY`

3. Start the stack:

```bash
docker compose up --build
```

4. Open the backend app:
- Local: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

## Django commands

Run in the backend folder:

```bash
cd backend
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

If you need a shell:

```bash
docker compose exec backend python manage.py shell
```

## Notes

- MinIO console is available at `http://localhost:9001`
- PostgreSQL listens on `5432`
- Cloudflare tunnel uses the token from `.env`
