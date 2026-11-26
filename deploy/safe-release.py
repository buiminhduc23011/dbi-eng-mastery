"""One-off additive release: run on home-server with sudo, after uploading a fresh build.
Keeps the old executable tree and makes a consistent SQLite backup; never deletes data.
"""
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.request

BASE = Path('/home/ducne/engmastery')
RELEASE = os.environ.get('ENGMASTERY_RELEASE', '20261126-ui-redesign')
CURRENT = BASE / 'server'
STAGED = BASE / ('staging-' + RELEASE) / 'server'
PREVIOUS = BASE / ('server-before-' + RELEASE)
BACKUP = BASE / 'backups' / RELEASE
DB = BASE / 'data/engmastery.db'

def command(*args):
    return subprocess.check_output(args, text=True).strip()

def preflight():
    for path in (BASE, CURRENT, DB):
        if path.resolve() != path or not path.exists():
            raise RuntimeError('Unexpected/missing deployment target: ' + str(path))
    pid = command('systemctl', 'show', 'engmastery', '-p', 'MainPID', '--value')
    env = dict(item.split(b'=', 1) for item in Path('/proc/' + pid + '/environ').read_bytes().split(b'\0') if b'=' in item)
    if env.get(b'ConnectionStrings__Sqlite', b'').decode() != 'Data Source=' + str(DB):
        raise RuntimeError('Active SQLite path is not the expected persistent database')
    if env.get(b'Database__Provider', b'auto').lower() == b'sqlserver' or env.get(b'ConnectionStrings__SqlServer'):
        raise RuntimeError('SQL Server configuration needs a separate backup workflow')
    # Environment pins SQLite path; check JSON configs for unexpected provider switches.
    for name in ('appsettings.json', 'appsettings.Production.json'):
        path = CURRENT / name
        if path.exists():
            cfg = json.loads(path.read_text(encoding='utf-8-sig'))
            if cfg.get('Database', {}).get('Provider', 'auto').lower() == 'sqlserver' or cfg.get('ConnectionStrings', {}).get('SqlServer'):
                raise RuntimeError('Unexpected SQL Server configuration')
    print('Preflight: active service uses persistent SQLite at ' + str(DB), flush=True)

def verify_rows():
    with sqlite3.connect('file:' + str(BACKUP / 'engmastery.db') + '?mode=ro', uri=True) as before, sqlite3.connect('file:' + str(DB) + '?mode=ro', uri=True) as after:
        results = {}
        for table, key in [('VocabCards', 'Id'), ('SentenceDrills', 'Id'), ('StudyLogs', 'Id'), ('AppSettings', 'Key'), ('__EFMigrationsHistory', 'MigrationId')]:
            old_columns = [r[1] for r in before.execute('PRAGMA table_info("' + table + '")')]
            key_index = old_columns.index(key)
            projection = ','.join('"' + c + '"' for c in old_columns)
            old = {r[key_index]: r for r in before.execute('SELECT ' + projection + ' FROM "' + table + '"')}
            new = {r[key_index]: r for r in after.execute('SELECT ' + projection + ' FROM "' + table + '"')}
            if any(new.get(k) != v for k, v in old.items()):
                raise RuntimeError('Existing rows changed in ' + table + '; backup retained for investigation')
            results[table] = {'preserved': len(old), 'added': len(new) - len(old)}
        print('Data verification: ' + json.dumps(results), flush=True)
        return results

def deploy():
    preflight()
    if os.geteuid() != 0:
        raise RuntimeError('Run deployment with sudo')
    if STAGED.resolve() != STAGED or not (STAGED / 'EngMastery.Api').is_file() or not (STAGED / 'wwwroot/index.html').is_file():
        raise RuntimeError('Fresh staged distribution missing')
    if PREVIOUS.exists() or BACKUP.exists():
        raise RuntimeError('Release backup already exists; refusing to overwrite it')
    # Preserve runtime configuration without displaying credentials.
    for name in ('appsettings.json', 'appsettings.Production.json'):
        if (CURRENT / name).exists():
            shutil.copy2(CURRENT / name, STAGED / name)
    uid, gid = CURRENT.stat().st_uid, CURRENT.stat().st_gid
    for parent, directories, files in os.walk(STAGED):
        os.chown(parent, uid, gid)
        for name in files:
            os.chown(Path(parent) / name, uid, gid)
    (STAGED / 'EngMastery.Api').chmod(0o755)
    BACKUP.mkdir(parents=True, mode=0o700)
    swapped = False
    try:
        subprocess.run(['systemctl', 'stop', 'engmastery'], check=True)
        with sqlite3.connect('file:' + str(DB) + '?mode=ro', uri=True) as source, sqlite3.connect(BACKUP / 'engmastery.db') as target:
            source.backup(target)
            if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('Backup integrity check failed')
        (BACKUP / 'engmastery.db').chmod(0o600)
        shutil.copy2('/etc/systemd/system/engmastery.service', BACKUP / 'engmastery.service')
        os.rename(CURRENT, PREVIOUS)
        os.rename(STAGED, CURRENT)
        swapped = True
        subprocess.run(['systemctl', 'start', 'engmastery'], check=True)
        for attempt in range(30):
            try:
                with urllib.request.urlopen('http://127.0.0.1:8090/api/learning/progress', timeout=2) as response:
                    if response.status == 200 and isinstance(json.load(response), dict):
                        break
            except Exception:
                if attempt == 29:
                    raise RuntimeError('New API did not become healthy')
                time.sleep(1)
        with urllib.request.urlopen('http://127.0.0.1:8090/', timeout=5) as response:
            if response.read() != (CURRENT / 'wwwroot/index.html').read_bytes():
                raise RuntimeError('Served frontend does not match the release')
        result = verify_rows()
        (BACKUP / 'verification.json').write_text(json.dumps(result, indent=2))
        print('Release healthy. Database backup: ' + str(BACKUP / 'engmastery.db'), flush=True)
        print('Previous executable tree: ' + str(PREVIOUS), flush=True)
    except BaseException:
        # Roll back binaries only; do not overwrite a live database or lose new study activity.
        subprocess.run(['systemctl', 'stop', 'engmastery'], check=False)
        if swapped:
            os.rename(CURRENT, BASE / ('server-failed-' + RELEASE))
        if PREVIOUS.exists() and not CURRENT.exists():
            os.rename(PREVIOUS, CURRENT)
        subprocess.run(['systemctl', 'start', 'engmastery'], check=False)
        raise

if __name__ == '__main__':
    if '--inspect' in sys.argv:
        preflight()
    else:
        deploy()
