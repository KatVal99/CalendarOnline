import re

with open('supabase_import.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

clean_lines = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith('\\'):
        continue
    if stripped.startswith('ALTER TABLE') and 'OWNER TO' in stripped:
        continue
    if stripped.startswith('SET ') or stripped.startswith('SELECT pg_catalog'):
        continue
    clean_lines.append(line)

with open('supabase_clean_editor.sql', 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)

print("Clean SQL generated successfully!")
