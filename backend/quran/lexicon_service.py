import sqlite3
import os
import re

LEXICON_DB_PATH = os.path.join(os.path.dirname(__file__), 'lexicons.sqlite')


def clean_html_formatting(text):
    if not text:
        return ''
    # Replace <br>, <br/> with newline
    cleaned = re.sub(r'<br\s*/?>', '\n', text)
    # Remove any extra tags
    cleaned = re.sub(r'<[^>]+>', '', cleaned)
    # Replace multiple newlines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def lookup_lexicon(root, kitab_slug='al-mujam-al-waseet'):
    """
    Looks up authentic dictionary text from lexicons.sqlite:
    - 'al-mujam-al-waseet' -> table mujamul_wasith
    - 'al-mufradat' -> table mufradat
    """
    if not os.path.exists(LEXICON_DB_PATH) or not root:
        return None

    clean_root = root.strip().replace(' ', '')
    variants = [clean_root]
    if clean_root.endswith('ي'):
        variants.append(clean_root[:-1] + 'ى')
    elif clean_root.endswith('ى'):
        variants.append(clean_root[:-1] + 'ي')
    if clean_root.endswith('و'):
        variants.append(clean_root[:-1] + 'ا')

    table_name = 'mujamul_wasith' if kitab_slug == 'al-mujam-al-waseet' else 'mufradat'

    try:
        conn = sqlite3.connect(LEXICON_DB_PATH)
        cur = conn.cursor()
        for v in variants:
            q = f"SELECT word, meanings FROM {table_name} WHERE word = ? OR word LIKE ? OR word LIKE ?"
            row = cur.execute(q, (v, f'{v}|%', f'%|{v}')).fetchone()
            if row and row[1]:
                conn.close()
                return {
                    'root': row[0],
                    'content': clean_html_formatting(row[1])
                }
        conn.close()
    except Exception:
        pass
    return None
