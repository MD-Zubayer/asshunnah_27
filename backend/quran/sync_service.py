import urllib.request
import json
import logging
import re
from .models import Kitab, AyahTranslation, AyahTafsir

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; AsSunnahApp/1.0)',
    'Accept': 'application/json',
}


def _http_get_json(url, timeout=12):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode('utf-8'))
    except Exception as err:
        logger.warning(f"Failed to fetch {url}: {err}")
    return None


def clean_html(text):
    if not text:
        return ''
    # Strip footnote tags and their contents (e.g. <sup foot_note=81607>1</sup>)
    text = re.sub(r'<sup[^>]*>.*?</sup>', '', text, flags=re.IGNORECASE | re.DOTALL)
    # Strip any remaining HTML tags (e.g. <br>, <i>, <p>)
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = (
        text.replace('&quot;', '"')
        .replace('&apos;', "'")
        .replace('&#39;', "'")
        .replace('&amp;', '&')
        .replace('&lt;', '<')
        .replace('&gt;', '>')
    )
    # Collapse multiple spaces and trim
    return re.sub(r'[ \t]+', ' ', text).strip()


def ensure_ayah_study_data(surah: int, ayah: int):
    """
    Ensures translations and authentic tafsirs for the specified ayah
    are stored permanently in the local PostgreSQL database.
    If missing, fetches them once from upstream and stores them (Write-Through DB Cache).
    """
    surah = int(surah)
    ayah = int(ayah)

    # 1. Check existing records in DB
    existing_trans_slugs = set(
        AyahTranslation.objects.filter(surah=surah, ayah=ayah).values_list('kitab__slug', flat=True)
    )
    existing_tafsir_slugs = set(
        AyahTafsir.objects.filter(surah=surah, ayah=ayah).values_list('kitab__slug', flat=True)
    )

    required_trans = {
        'trans-zakaria', 'trans-muhiuddin', 'trans-mujibur', 'trans-taisirul', 'trans-rawai',
        'trans-en-saheeh', 'trans-ur-tafsir-usmani'
    }
    required_tafsir = {'tafsir-ibn-kathir', 'tafsir-muyassar', 'tafsir-jalalayn'}

    needs_trans_fetch = not required_trans.issubset(existing_trans_slugs)
    needs_tafsir_fetch = not required_tafsir.issubset(existing_tafsir_slugs)

    if not needs_trans_fetch and not needs_tafsir_fetch:
        return  # Everything already exists locally in DB

    # 2. Pre-fetch Kitab model instances
    kitabs = {k.slug: k for k in Kitab.objects.filter(is_active=True)}

    # 3. Fetch missing Translations if needed
    if needs_trans_fetch:
        CDN_RESOURCE_MAP = {
            # Bengali
            213: 'trans-zakaria',
            163: 'trans-mujibur',
            161: 'trans-taisirul',
            162: 'trans-rawai',
            # English
            20: 'trans-en-saheeh',
            203: 'trans-en-hilali',
            85: 'trans-en-haleem',
            84: 'trans-en-taqi-usmani',
            19: 'trans-en-pickthall',
            22: 'trans-en-yusuf-ali',
            # Urdu
            151: 'trans-ur-tafsir-usmani',
            54: 'trans-ur-junagarhi',
            234: 'trans-ur-jalandhari',
            158: 'trans-ur-israr-ahmad',
        }
        res_ids_str = ",".join(str(i) for i in CDN_RESOURCE_MAP.keys())
        cdn_url = f"https://api.qurancdn.com/api/qdc/verses/by_key/{surah}:{ayah}?translations={res_ids_str}"
        cdn_data = _http_get_json(cdn_url)
        if cdn_data and 'verse' in cdn_data:
            trans_list = cdn_data.get('verse', {}).get('translations', [])
            for t in trans_list:
                res_id = t.get('resource_id')
                txt = clean_html(t.get('text', ''))
                target_slug = CDN_RESOURCE_MAP.get(res_id)
                if target_slug and target_slug in kitabs and txt:
                    AyahTranslation.objects.update_or_create(
                        kitab=kitabs[target_slug],
                        surah=surah,
                        ayah=ayah,
                        defaults={'translation_text': txt}
                    )

        # B. AlQuran.cloud for Maulana Muhiuddin Khan
        if 'trans-muhiuddin' not in existing_trans_slugs and 'trans-muhiuddin' in kitabs:
            muhi_url = f"https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/bn.bengali"
            muhi_data = _http_get_json(muhi_url)
            txt = muhi_data.get('data', {}).get('text') if muhi_data else None
            if txt:
                AyahTranslation.objects.update_or_create(
                    kitab=kitabs['trans-muhiuddin'],
                    surah=surah,
                    ayah=ayah,
                    defaults={'translation_text': clean_html(txt)}
                )

    # 4. Fetch missing Tafsirs if needed
    if needs_tafsir_fetch:
        # A. Classical Arabic Tafsir Ibn Kathir (Resource 14) from QuranCDN
        if 'tafsir-ibn-kathir' not in existing_tafsir_slugs and 'tafsir-ibn-kathir' in kitabs:
            ik_url = f"https://api.qurancdn.com/api/qdc/tafsirs/14/by_ayah/{surah}:{ayah}"
            ik_data = _http_get_json(ik_url)
            txt = ik_data.get('tafsir', {}).get('text') if ik_data else None
            if txt:
                AyahTafsir.objects.update_or_create(
                    kitab=kitabs['tafsir-ibn-kathir'],
                    surah=surah,
                    ayah=ayah,
                    defaults={'tafsir_text': txt.strip()}
                )

        # B. Tafsir Muyassar (Resource 16) from QuranCDN
        if 'tafsir-muyassar' not in existing_tafsir_slugs and 'tafsir-muyassar' in kitabs:
            muyassar_url = f"https://api.qurancdn.com/api/qdc/tafsirs/16/by_ayah/{surah}:{ayah}"
            muy_data = _http_get_json(muyassar_url)
            txt = muy_data.get('tafsir', {}).get('text') if muy_data else None
            if txt:
                AyahTafsir.objects.update_or_create(
                    kitab=kitabs['tafsir-muyassar'],
                    surah=surah,
                    ayah=ayah,
                    defaults={'tafsir_text': txt.strip()}
                )

        # C. Tafsir Jalalayn from AlQuran.cloud
        if 'tafsir-jalalayn' not in existing_tafsir_slugs and 'tafsir-jalalayn' in kitabs:
            jalal_url = f"https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/ar.jalalayn"
            jalal_data = _http_get_json(jalal_url)
            txt = jalal_data.get('data', {}).get('text') if jalal_data else None
            if txt:
                AyahTafsir.objects.update_or_create(
                    kitab=kitabs['tafsir-jalalayn'],
                    surah=surah,
                    ayah=ayah,
                    defaults={'tafsir_text': txt.strip()}
                )
