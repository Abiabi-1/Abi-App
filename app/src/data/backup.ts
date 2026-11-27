// Backup (one JSON file with every record) and Restore (this app's backups, and the old app's backup files).
import { rawAll, put, raw, restore as undelete, Rec, flush } from './store';
import { runMigration, Report } from './migrate';
import { download, lsSet, todayKey } from '../lib/util';

export function backup(tag = '') {
  const recs = rawAll().filter(r => r.c.charAt(0) !== '_').map(r => ({ c: r.c, id: r.id, d: r.d, t: r.t, x: r.x || null, u: r.u }));
  download('abi-app-backup-' + todayKey() + (tag ? '-' + tag : '') + '.json', JSON.stringify({ app: 'abi-app', v: 2, at: new Date().toISOString(), records: recs }), 'application/json');
  lsSet('v2_last_backup', String(Date.now()));
  return recs.length;
}
export async function restoreFile(file: File): Promise<{ kind: 'v2' | 'old'; n: number; report?: Report }> {
  const txt = await file.text(); const o = JSON.parse(txt);
  if (o && o.app === 'abi-app' && Array.isArray(o.records)) {
    let n = 0;
    (o.records as Rec[]).forEach(r => {
      if (!r || !r.c || r.id == null || r.c.charAt(0) === '_') return;
      if (r.x) return;   // deleted in the backup: leave as it is now
      const cur = raw(r.c, String(r.id)); if (cur && cur.x) undelete(r.c, String(r.id));
      put(r.c, String(r.id), r.d || {}); n++;
    });
    await flush(); return { kind: 'v2', n };
  }
  if (o && o.keys && typeof o.keys === 'object') {   // the old app's backup file
    const rep = runMigration(o.keys, 'old backup file'); await flush(); return { kind: 'old', n: rep.added + rep.updated, report: rep };
  }
  throw new Error('That is not a backup file made by this app.');
}
