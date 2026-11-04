/**
 * ACRI WEBSITE BACKEND — Google Apps Script
 * ==========================================
 * One Google Sheet controls www.acriindia.org:
 *   Settings      → maintenance mode, announcement bar, notification emails
 *   News          → "From the Centre" cards on the home page and /news
 *   Schools       → the public list on /school-network
 *   Applications  → School Research Network applications from /apply
 *   Files         → media library (images uploaded from /admin, stored in Google Drive, served at /files/…)
 *   Slides        → the home-page banner carousel
 *   Pages         → banner image + wording for any page (e.g. /about)
 *   Log           → audit trail of every admin action
 *
 * SET-UP (once)
 *   1. Open the Google Sheet → Extensions → Apps Script → paste this file as Code.gs.
 *   2. Run  setup()  once (authorise when asked). It creates all tabs, seeds data,
 *      and generates an admin password (see View → Logs / Execution log).
 *      To choose your own: Project Settings → Script Properties → ADMIN_PASSWORD.
 *   3. Deploy → Manage deployments → edit your existing Web App deployment →
 *      Version: "New version" → Execute as: Me → Who has access: Anyone → Deploy.
 *      (Editing the existing deployment keeps the same /exec URL.)
 *
 * MAINTENANCE MODE
 *   Settings tab → MAINTENANCE_MODE → TRUE   (or toggle it from /admin).
 *   The whole public site shows the maintenance page within ~1 minute.
 *   /admin keeps working so you can switch it back off.
 */

/* ---------- configuration ---------- */
const SPREADSHEET_ID = '';          // leave empty if this script is bound to the Sheet
const SITE_URL_DEFAULT = 'https://www.acriindia.org';
const DRIVE_FOLDER_NAME = 'ACRI Website Files';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const TOKEN_HOURS = 6;

const SHEETS = {
  Settings: ['Key', 'Value', 'Notes'],
  News: ['ID', 'Date', 'Category', 'Title', 'Summary', 'Link', 'Published', 'Pinned', 'Image'],
  Schools: ['ID', 'School Name', 'City', 'State', 'Country', 'Principal', 'School Research Coordinator',
            'School Code', 'Address', 'Joined', 'Visible'],
  Applications: ['Application ID', 'Submitted At', 'Status', 'School Name', 'Board / Curriculum', 'City', 'State',
                 'Country', 'Address', 'Principal Name', 'Coordinator Name', 'Coordinator Designation',
                 'Coordinator Email', 'Coordinator Phone', 'School Website', 'Approx. Students Interested',
                 'Preferred Programme', 'Statement of Interest', 'Reviewer Notes', 'School Code',
                 'Updated At', 'Updated By'],
  Files: ['Slug', 'Drive File ID', 'Original Name', 'Type', 'Size (KB)', 'Alt Text', 'Credit', 'Uploaded At', 'Uploaded By'],
  Slides: ['ID', 'Order', 'Image', 'Kicker', 'Title', 'Text', 'Link Label', 'Link', 'Visible'],
  Pages: ['Path', 'Image', 'Kicker', 'Title', 'Lead', 'Credit'],
  Log: ['Time', 'Actor', 'Action', 'Details']
};

const DEFAULT_SETTINGS = [
  ['MAINTENANCE_MODE', 'FALSE', 'TRUE = public site shows the maintenance page. /admin stays available.'],
  ['MAINTENANCE_MESSAGE', 'We are making improvements to the ACRI website. Please check back shortly.', 'Shown on the maintenance page.'],
  ['ANNOUNCEMENT_TEXT', '', 'Optional bar at the top of every page. Leave empty to hide.'],
  ['ANNOUNCEMENT_LINK', '', 'Optional link for the announcement bar (e.g. /news).'],
  ['NOTIFY_EMAIL', 'office.secretariats@acriindia.org', 'Receives an email for every new school application.'],
  ['REPLY_TO', 'office.secretariats@acriindia.org', 'Reply-to address on emails sent to schools.'],
  ['APPLICATIONS_OPEN', 'TRUE', 'FALSE closes the /apply form.'],
  ['SITE_URL', 'https://www.acriindia.org', 'Website address used in emails (e.g. https://acriindia.org.in while testing).']
];

const PUBLIC_SETTING_KEYS = ['MAINTENANCE_MODE', 'MAINTENANCE_MESSAGE', 'ANNOUNCEMENT_TEXT',
                             'ANNOUNCEMENT_LINK', 'APPLICATIONS_OPEN'];

const APP_STATUSES = ['Received', 'Under Review', 'Approved', 'Declined', 'Withdrawn'];

/* ---------- sheet helpers ---------- */
function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  const book = ss_();
  let sh = book.getSheetByName(name);
  if (!sh) {
    sh = book.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]])
      .setFontWeight('bold').setBackground('#12304A').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  } else {
    // add any columns introduced by an update (never removes or reorders existing ones)
    const want = SHEETS[name];
    const width = sh.getLastColumn();
    const have = width ? sh.getRange(1, 1, 1, width).getValues()[0].map(String) : [];
    want.forEach((h, i) => { if (have.indexOf(h) < 0) { have.push(h); sh.getRange(1, have.length).setValue(h).setFontWeight('bold'); } });
  }
  return sh;
}

function siteUrl_() {
  const v = String(settings_().SITE_URL || '').trim().replace(/\/$/, '');
  return v || SITE_URL_DEFAULT;
}

function rows_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  const head = values.shift() || [];
  return values
    .map((r, i) => { const o = { _row: i + 2 }; head.forEach((h, j) => o[h] = r[j]); return o; })
    .filter(o => head.some(h => o[h] !== '' && o[h] !== null));
}

function writeRow_(name, rowNumber, obj) {
  const sh = sheet_(name);
  const head = SHEETS[name];
  const existing = rowNumber ? sh.getRange(rowNumber, 1, 1, head.length).getValues()[0] : [];
  const row = head.map((h, j) => (h in obj ? obj[h] : (existing[j] !== undefined ? existing[j] : '')));
  if (rowNumber) sh.getRange(rowNumber, 1, 1, head.length).setValues([row]);
  else sh.appendRow(row);
}

function settings_() {
  const out = {};
  rows_('Settings').forEach(r => out[String(r.Key).trim()] = r.Value);
  return out;
}

function truthy_(v) {
  return v === true || /^(true|yes|1|on)$/i.test(String(v).trim());
}

function iso_(d) {
  if (!d) return '';
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
  }
  return String(d);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max || 500);
}

function newId_(prefix) {
  const d = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd');
  return prefix + '-' + d + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function log_(actor, action, details) {
  sheet_('Log').appendRow([new Date(), actor, action, clean_(details, 2000)]);
}

/* ---------- public data ---------- */
function publicData_() {
  const s = settings_();
  const settings = {};
  PUBLIC_SETTING_KEYS.forEach(k => settings[k] = s[k] === undefined ? '' : s[k]);

  const news = rows_('News')
    .filter(r => truthy_(r.Published))
    .map(r => ({
      id: String(r.ID), date: iso_(r.Date), category: String(r.Category || ''),
      title: String(r.Title || ''), summary: String(r.Summary || ''), link: String(r.Link || ''),
      pinned: truthy_(r.Pinned), image: String(r.Image || '')
    }))
    .sort((a, b) => (b.pinned - a.pinned) || String(b.date).localeCompare(String(a.date)));

  const schools = rows_('Schools')
    .filter(r => truthy_(r.Visible))
    .map(r => ({
      id: String(r.ID), name: String(r['School Name'] || ''), city: String(r.City || ''),
      state: String(r.State || ''), country: String(r.Country || 'India'),
      principal: String(r.Principal || ''), coordinator: String(r['School Research Coordinator'] || ''),
      code: String(r['School Code'] || ''), address: String(r.Address || ''), joined: iso_(r.Joined)
    }));

  const files = {};
  rows_('Files').forEach(r => {
    if (!r.Slug || !r['Drive File ID']) return;
    files[String(r.Slug)] = { id: String(r['Drive File ID']), type: String(r.Type || 'image/jpeg'),
                              alt: String(r['Alt Text'] || ''), credit: String(r.Credit || '') };
  });

  const slides = rows_('Slides')
    .filter(r => truthy_(r.Visible) && (r.Title || r.Image))
    .sort((a, b) => Number(a.Order || 0) - Number(b.Order || 0))
    .map(r => ({ image: String(r.Image || ''), kicker: String(r.Kicker || ''), title: String(r.Title || ''),
                 text: String(r.Text || ''), linkLabel: String(r['Link Label'] || ''), link: String(r.Link || '') }));

  const pages = {};
  rows_('Pages').forEach(r => {
    if (!String(r.Path || '').trim()) return;
    pages[normPath_(r.Path)] = { image: String(r.Image || ''), kicker: String(r.Kicker || ''), title: String(r.Title || ''),
                                 lead: String(r.Lead || ''), credit: String(r.Credit || '') };
  });

  return { ok: true, updated: new Date().toISOString(), settings, news, schools, slides, pages, files };
}

/* ---------- web app entry points ---------- */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'public';
  try {
    if (action === 'public') return json_(publicData_());
    if (action === 'health') return json_({ ok: true, time: new Date().toISOString() });
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'Invalid request' }); }

  try {
    switch (body.action) {
      case 'apply':                    return json_(apply_(body));
      case 'admin.login':              return json_(login_(body));
      case 'admin.logout':             return json_(logout_(body));
      case 'admin.data':               return json_(withAdmin_(body, adminData_));
      case 'admin.updateApplication':  return json_(withAdmin_(body, updateApplication_));
      case 'admin.saveNews':           return json_(withAdmin_(body, saveNews_));
      case 'admin.deleteNews':         return json_(withAdmin_(body, deleteNews_));
      case 'admin.saveSchool':         return json_(withAdmin_(body, saveSchool_));
      case 'admin.saveSettings':       return json_(withAdmin_(body, saveSettings_));
      case 'admin.uploadFile':         return json_(withAdmin_(body, uploadFile_));
      case 'admin.saveFile':           return json_(withAdmin_(body, saveFile_));
      case 'admin.deleteFile':         return json_(withAdmin_(body, deleteFile_));
      case 'admin.saveSlide':          return json_(withAdmin_(body, saveSlide_));
      case 'admin.deleteSlide':        return json_(withAdmin_(body, deleteSlide_));
      case 'admin.savePage':           return json_(withAdmin_(body, savePage_));
      case 'admin.deletePage':         return json_(withAdmin_(body, deletePage_));
      default:                         return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- school application ---------- */
function apply_(b) {
  const s = settings_();
  if (!truthy_(s.APPLICATIONS_OPEN === '' ? 'TRUE' : s.APPLICATIONS_OPEN)) {
    return { ok: false, error: 'Applications are currently closed. Please write to ' + (s.REPLY_TO || 'contact@acriindia.org') + '.' };
  }
  if (b.company_website) return { ok: true, id: 'OK' };               // honeypot: bots fill hidden field

  const cache = CacheService.getScriptCache();
  const ipKey = 'apply_ip_' + clean_(b._ip, 64);
  if (b._ip && Number(cache.get(ipKey) || 0) >= 5) {
    return { ok: false, error: 'Too many submissions. Please try again later.' };
  }

  const required = { schoolName: 'School name', city: 'City', state: 'State', principalName: 'Principal name',
                     coordinatorName: 'Coordinator name', coordinatorEmail: 'Coordinator email',
                     coordinatorPhone: 'Coordinator phone', statement: 'Statement of interest' };
  for (const k in required) if (!clean_(b[k])) return { ok: false, error: required[k] + ' is required.' };
  const email = clean_(b.coordinatorEmail, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };

  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let id;
  try {
    id = newId_('SRN');
    writeRow_('Applications', null, {
      'Application ID': id, 'Submitted At': new Date(), 'Status': 'Received',
      'School Name': clean_(b.schoolName, 200), 'Board / Curriculum': clean_(b.board, 100),
      'City': clean_(b.city, 100), 'State': clean_(b.state, 100), 'Country': clean_(b.country || 'India', 100),
      'Address': clean_(b.address, 500), 'Principal Name': clean_(b.principalName, 150),
      'Coordinator Name': clean_(b.coordinatorName, 150), 'Coordinator Designation': clean_(b.coordinatorDesignation, 150),
      'Coordinator Email': email, 'Coordinator Phone': clean_(b.coordinatorPhone, 40),
      'School Website': clean_(b.website, 300), 'Approx. Students Interested': clean_(b.students, 20),
      'Preferred Programme': clean_(b.programme, 200), 'Statement of Interest': clean_(b.statement, 3000),
      'Updated At': new Date(), 'Updated By': 'applicant'
    });
  } finally { lock.releaseLock(); }

  if (b._ip) cache.put(ipKey, String(Number(cache.get(ipKey) || 0) + 1), 3600);

  const school = clean_(b.schoolName, 200);
  try {
    MailApp.sendEmail({
      to: email, replyTo: s.REPLY_TO || 'office.secretariats@acriindia.org',
      name: 'ACRI School Research Network',
      subject: 'Application received: ' + school + ' (' + id + ')',
      htmlBody: mailShell_(
        '<p>Dear ' + esc_(clean_(b.coordinatorName)) + ',</p>' +
        '<p>Thank you for applying for <b>' + esc_(school) + '</b> to join the ACRI School Research Network.</p>' +
        '<p>Your application reference is <b>' + id + '</b>. The Office of Research Secretariats will review it and write to you. ' +
        'Please quote this reference in any correspondence.</p>' +
        '<p>With regards,<br>Office of Research Secretariats<br>Ahmedabad Centre for Research and Innovation</p>')
    });
    if (s.NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: s.NOTIFY_EMAIL, name: 'ACRI Website',
        subject: 'New School Research Network application: ' + school,
        htmlBody: mailShell_('<p>A new application has been submitted.</p><p><b>' + esc_(school) + '</b>, ' +
          esc_(clean_(b.city)) + ', ' + esc_(clean_(b.state)) + '<br>Reference: ' + id + '<br>Coordinator: ' +
          esc_(clean_(b.coordinatorName)) + ' (' + esc_(email) + ')</p><p>Review it at <a href="' + siteUrl_() + '/admin">' +
          siteUrl_() + '/admin</a>.</p>')
      });
    }
  } catch (err) { log_('system', 'mail-error', String(err)); }

  log_('applicant', 'apply', id + ' ' + school);
  return { ok: true, id: id };
}

/* ---------- admin auth ---------- */
function login_(b) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('login_fails') || 0);
  if (fails >= 10) return { ok: false, error: 'Too many failed attempts. Try again in 15 minutes.' };

  const stored = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!stored) return { ok: false, error: 'Admin password not set. Run setup() in Apps Script.' };
  if (String(b.password || '') !== stored) {
    cache.put('login_fails', String(fails + 1), 900);
    Utilities.sleep(800);
    return { ok: false, error: 'Incorrect password.' };
  }
  const name = clean_(b.name || 'Admin', 60);
  const token = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
  cache.put('tok_' + token, name, TOKEN_HOURS * 3600);
  log_(name, 'login', 'Admin signed in');
  return { ok: true, token: token, name: name };
}

function logout_(b) {
  if (b.token) CacheService.getScriptCache().remove('tok_' + b.token);
  return { ok: true };
}

function withAdmin_(b, fn) {
  const name = b.token && CacheService.getScriptCache().get('tok_' + b.token);
  if (!name) return { ok: false, error: 'Session expired. Please sign in again.', auth: false };
  return fn(b, name);
}

/* ---------- admin actions ---------- */
function adminData_() {
  const stringify = o => { const r = {}; Object.keys(o).forEach(k => {
    const v = o[k]; r[k] = Object.prototype.toString.call(v) === '[object Date]'
      ? Utilities.formatDate(v, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm') : v; }); return r; };
  const s = settings_();
  return {
    ok: true,
    statuses: APP_STATUSES,
    applications: rows_('Applications').map(stringify).reverse(),
    news: rows_('News').map(stringify),
    schools: rows_('Schools').map(stringify),
    files: rows_('Files').map(stringify).reverse(),
    slides: rows_('Slides').map(stringify).sort((a, b) => Number(a.Order || 0) - Number(b.Order || 0)),
    pages: rows_('Pages').map(stringify),
    settings: DEFAULT_SETTINGS.map(d => ({ key: d[0], value: s[d[0]] === undefined ? d[1] : String(s[d[0]]), notes: d[2] }))
  };
}

function updateApplication_(b, actor) {
  const app = rows_('Applications').find(r => String(r['Application ID']) === String(b.id));
  if (!app) return { ok: false, error: 'Application not found.' };
  const status = APP_STATUSES.indexOf(b.status) > -1 ? b.status : app.Status;
  const prev = app.Status;

  writeRow_('Applications', app._row, {
    'Status': status, 'Reviewer Notes': clean_(b.notes, 3000),
    'School Code': clean_(b.schoolCode, 40), 'Updated At': new Date(), 'Updated By': actor
  });

  if (status === 'Approved' && b.addToNetwork) {
    const exists = rows_('Schools').some(r => String(r.ID) === String(app['Application ID']));
    if (!exists) {
      writeRow_('Schools', null, {
        'ID': app['Application ID'], 'School Name': app['School Name'], 'City': app.City, 'State': app.State,
        'Country': app.Country || 'India', 'Principal': app['Principal Name'],
        'School Research Coordinator': app['Coordinator Name'], 'School Code': clean_(b.schoolCode, 40),
        'Address': app.Address, 'Joined': new Date(), 'Visible': true
      });
    }
  }

  if (b.notify && status !== prev) {
    const s = settings_();
    const msg = {
      'Under Review': 'Your application is now under review by the Office of Research Secretariats.',
      'Approved': 'We are pleased to confirm that your school has been admitted to the ACRI School Research Network.' +
                  (b.schoolCode ? ' Your School Code is <b>' + esc_(b.schoolCode) + '</b>.' : '') +
                  ' The Office of Research Secretariats will write to you with next steps.',
      'Declined': 'After careful review, we are unable to admit your school to the network at this time. ' +
                  'We are grateful for your interest and welcome future correspondence.',
      'Withdrawn': 'Your application has been marked as withdrawn.',
      'Received': 'Your application has been received.'
    }[status];
    try {
      MailApp.sendEmail({
        to: app['Coordinator Email'], replyTo: s.REPLY_TO || 'office.secretariats@acriindia.org',
        name: 'ACRI School Research Network',
        subject: 'Application ' + app['Application ID'] + ': ' + status,
        htmlBody: mailShell_('<p>Dear ' + esc_(app['Coordinator Name']) + ',</p><p>' + msg + '</p>' +
          '<p>Reference: <b>' + app['Application ID'] + '</b> · ' + esc_(app['School Name']) + '</p>' +
          '<p>With regards,<br>Office of Research Secretariats<br>Ahmedabad Centre for Research and Innovation</p>')
      });
    } catch (err) { log_('system', 'mail-error', String(err)); }
  }

  log_(actor, 'application', app['Application ID'] + ': ' + prev + ' → ' + status);
  return { ok: true };
}

function saveNews_(b, actor) {
  const n = b.item || {};
  if (!clean_(n.title)) return { ok: false, error: 'Title is required.' };
  const record = {
    'Date': n.date ? new Date(n.date) : new Date(), 'Category': clean_(n.category, 60),
    'Title': clean_(n.title, 200), 'Summary': clean_(n.summary, 600), 'Link': clean_(n.link, 400),
    'Published': !!n.published, 'Pinned': !!n.pinned, 'Image': clean_(n.image, 400)
  };
  const existing = n.id && rows_('News').find(r => String(r.ID) === String(n.id));
  if (existing) writeRow_('News', existing._row, record);
  else { record.ID = newId_('N'); writeRow_('News', null, record); }
  log_(actor, 'news', (existing ? 'edit ' : 'add ') + record.Title);
  return { ok: true };
}

function deleteNews_(b, actor) {
  const r = rows_('News').find(x => String(x.ID) === String(b.id));
  if (!r) return { ok: false, error: 'Not found.' };
  sheet_('News').deleteRow(r._row);
  log_(actor, 'news', 'delete ' + r.Title);
  return { ok: true };
}

function saveSchool_(b, actor) {
  const n = b.item || {};
  if (!clean_(n.name)) return { ok: false, error: 'School name is required.' };
  const record = {
    'School Name': clean_(n.name, 200), 'City': clean_(n.city, 100), 'State': clean_(n.state, 100),
    'Country': clean_(n.country || 'India', 100), 'Principal': clean_(n.principal, 150),
    'School Research Coordinator': clean_(n.coordinator, 150), 'School Code': clean_(n.code, 40),
    'Address': clean_(n.address, 500), 'Visible': !!n.visible
  };
  const existing = n.id && rows_('Schools').find(r => String(r.ID) === String(n.id));
  if (existing) writeRow_('Schools', existing._row, record);
  else { record.ID = newId_('SCH'); record.Joined = new Date(); writeRow_('Schools', null, record); }
  log_(actor, 'school', (existing ? 'edit ' : 'add ') + record['School Name']);
  return { ok: true };
}

function saveSettings_(b, actor) {
  const sh = sheet_('Settings');
  const current = rows_('Settings');
  const allowed = DEFAULT_SETTINGS.map(d => d[0]);
  Object.keys(b.values || {}).forEach(key => {
    if (allowed.indexOf(key) < 0) return;
    const value = clean_(b.values[key], 1000);
    const row = current.find(r => String(r.Key) === key);
    if (row) sh.getRange(row._row, 2).setValue(value);
    else sh.appendRow([key, value, '']);
    log_(actor, 'setting', key + ' = ' + value);
  });
  return { ok: true };
}

/* ---------- media library (Google Drive) ---------- */
function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('DRIVE_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreate below */ } }
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
  props.setProperty('DRIVE_FOLDER_ID', f.getId());
  return f;
}

function slug_(name) {
  const base = String(name || 'image').toLowerCase().replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'image';
  return base + '-' + Math.random().toString(36).slice(2, 7);
}

function uploadFile_(b, actor) {
  const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' };
  const type = String(b.type || '');
  if (!types[type]) return { ok: false, error: 'Only JPG, PNG, WebP, GIF or PDF files can be uploaded.' };
  const bytes = Utilities.base64Decode(String(b.data || ''));
  if (!bytes.length) return { ok: false, error: 'The file is empty.' };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: 'File is larger than 8 MB.' };

  const slug = slug_(b.name) + '.' + types[type];
  const file = folder_().createFile(Utilities.newBlob(bytes, type, slug));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  writeRow_('Files', null, {
    'Slug': slug, 'Drive File ID': file.getId(), 'Original Name': clean_(b.name, 200), 'Type': type,
    'Size (KB)': Math.round(bytes.length / 1024), 'Alt Text': clean_(b.alt, 300), 'Credit': clean_(b.credit, 200),
    'Uploaded At': new Date(), 'Uploaded By': actor
  });
  log_(actor, 'file', 'upload ' + slug);
  return { ok: true, slug: slug, url: '/files/' + slug };
}

function saveFile_(b, actor) {
  const r = rows_('Files').find(x => String(x.Slug) === String(b.slug));
  if (!r) return { ok: false, error: 'File not found.' };
  writeRow_('Files', r._row, { 'Alt Text': clean_(b.alt, 300), 'Credit': clean_(b.credit, 200) });
  log_(actor, 'file', 'edit ' + r.Slug);
  return { ok: true };
}

function deleteFile_(b, actor) {
  const r = rows_('Files').find(x => String(x.Slug) === String(b.slug));
  if (!r) return { ok: false, error: 'File not found.' };
  try { DriveApp.getFileById(String(r['Drive File ID'])).setTrashed(true); } catch (e) { /* already gone */ }
  sheet_('Files').deleteRow(r._row);
  log_(actor, 'file', 'delete ' + r.Slug);
  return { ok: true };
}

/* ---------- home slides ---------- */
function saveSlide_(b, actor) {
  const n = b.item || {};
  if (!clean_(n.title) && !clean_(n.image)) return { ok: false, error: 'Add a title or an image.' };
  const record = {
    'Order': (n.order !== '' && n.order != null && isFinite(Number(n.order))) ? Number(n.order) : 1, 'Image': clean_(n.image, 400), 'Kicker': clean_(n.kicker, 80),
    'Title': clean_(n.title, 160), 'Text': clean_(n.text, 400), 'Link Label': clean_(n.linkLabel, 60),
    'Link': clean_(n.link, 400), 'Visible': !!n.visible
  };
  const existing = n.id && rows_('Slides').find(r => String(r.ID) === String(n.id));
  if (existing) writeRow_('Slides', existing._row, record);
  else { record.ID = newId_('S'); writeRow_('Slides', null, record); }
  log_(actor, 'slide', (existing ? 'edit ' : 'add ') + record.Title);
  return { ok: true };
}

function deleteSlide_(b, actor) {
  const r = rows_('Slides').find(x => String(x.ID) === String(b.id));
  if (!r) return { ok: false, error: 'Not found.' };
  sheet_('Slides').deleteRow(r._row);
  log_(actor, 'slide', 'delete ' + r.Title);
  return { ok: true };
}

/* ---------- page banners ---------- */
function normPath_(p) {
  return '/' + String(p || '').trim().replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
}

function savePage_(b, actor) {
  const n = b.item || {};
  const path = normPath_(n.path);
  if (path === '/') return { ok: false, error: 'Use Home slides for the home page.' };
  const record = { 'Path': path, 'Image': clean_(n.image, 400), 'Kicker': clean_(n.kicker, 80),
                   'Title': clean_(n.title, 160), 'Lead': clean_(n.lead, 500), 'Credit': clean_(n.credit, 200) };
  const existing = rows_('Pages').find(r => normPath_(r.Path) === path);
  if (existing) writeRow_('Pages', existing._row, record); else writeRow_('Pages', null, record);
  log_(actor, 'page', 'banner ' + path);
  return { ok: true };
}

function deletePage_(b, actor) {
  const path = normPath_(b.path);
  const r = rows_('Pages').find(x => normPath_(x.Path) === path);
  if (!r) return { ok: false, error: 'Not found.' };
  sheet_('Pages').deleteRow(r._row);
  log_(actor, 'page', 'reset ' + path);
  return { ok: true };
}

/* ---------- email shell ---------- */
function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mailShell_(inner) {
  return '<div style="font-family:Georgia,serif;max-width:600px;margin:auto;border-top:6px solid #12304A">' +
    '<div style="padding:22px 26px;background:#F6F4EE"><div style="font-size:18px;color:#12304A">Ahmedabad Centre for Research and Innovation</div>' +
    '<div style="font:600 11px Arial,sans-serif;letter-spacing:2px;color:#5BA400;text-transform:uppercase;margin-top:4px">Where Ideas Become Institutions</div></div>' +
    '<div style="padding:24px 26px;font:15px/1.6 Arial,sans-serif;color:#1B232B">' + inner + '</div>' +
    '<div style="padding:16px 26px;font:12px Arial,sans-serif;color:#56606A;border-top:1px solid #D8D2C2">' +
    '<a href="' + siteUrl_() + '" style="color:#12304A">' + siteUrl_().replace(/^https?:\/\//, '') + '</a> · contact@acriindia.org</div></div>';
}

/* ---------- one-time setup ---------- */
function setup() {
  Object.keys(SHEETS).forEach(sheet_);

  const set = sheet_('Settings');
  const have = rows_('Settings').map(r => String(r.Key));
  DEFAULT_SETTINGS.forEach(d => { if (have.indexOf(d[0]) < 0) set.appendRow(d); });

  if (rows_('News').length === 0) {
    const n = sheet_('News');
    n.appendRow(['N-SEED-1', '', 'Research', 'Beyond 2030 begins its Documentation phase',
      'The programme is building a country-wise archival record of official SDG statements.', '/beyond-2030', true, true]);
    n.appendRow(['N-SEED-2', '', 'Publishing', 'IJBMRS publishes Volume 2',
      'The International Journal of Business and Management Research Studies releases its second volume.',
      'https://www.ijbmrs.org/', true, false]);
    n.appendRow(['N-SEED-3', '', 'Schools', 'Apple Global School joins the School Research Network',
      'Students engage with ACRI\'s governed research programmes through structured coordination.', '/school-network', true, false]);
  }

  if (rows_('Slides').length === 0) {
    const sl = sheet_('Slides');
    const C = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
    sl.appendRow(['S-SEED-1', 1, C + '0082423_Rudabai_Step_Well,_Adalaj_Gujarat_146.jpg?width=2400', 'Ahmedabad Centre for Research and Innovation',
      'Where ideas become institutions.', 'An independent research and innovation institution in Ahmedabad, built for the long horizon.', 'Discover ACRI', '/about', true]);
    sl.appendRow(['S-SEED-2', 2, C + 'Carved_Mesh_of_Sidi_Saiyyed_Mosque_Ahmedabad_Gujarat_DSC001.jpg?width=2400', 'Flagship research programme',
      'What comes after the Sustainable Development Goals?', 'Beyond 2030 is building the evidence base for the next global development agenda.', 'Explore Beyond 2030', '/beyond-2030', true]);
    sl.appendRow(['S-SEED-3', 3, C + 'Adalaj_Stepwell_Interior.jpg?width=2400', 'School Research Network',
      'Bring research thinking into your school.', "Students observe, document and inquire inside ACRI's governed research programmes.", 'Apply for your school', '/apply', true]);
  }
  if (rows_('Schools').length === 0) {
    sheet_('Schools').appendRow(['SCH-AGS', 'Apple Global School', 'Ahmedabad', 'Gujarat', 'India',
      'Ms. Nivedita Chakravarti', 'Ms. Ishita Pancholi', 'IN-GJ328810-AGS', 'XCQ9+J8Q, Gibpura, Gujarat 380057', '', true]);
  }

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_PASSWORD')) {
    const pw = 'ACRI-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    props.setProperty('ADMIN_PASSWORD', pw);
    Logger.log('Admin password created: ' + pw + '  (change it in Project Settings → Script Properties)');
  } else {
    Logger.log('Admin password already set (Project Settings → Script Properties → ADMIN_PASSWORD).');
  }

  folder_();   // creates the Drive folder for uploads and asks for Drive permission
  Object.keys(SHEETS).forEach(name => sheet_(name).autoResizeColumns(1, SHEETS[name].length));
  Logger.log('ACRI backend ready.');
}

/* Adds an "ACRI" menu in the Sheet for quick maintenance switching */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ACRI Website')
    .addItem('Turn maintenance ON', 'maintenanceOn')
    .addItem('Turn maintenance OFF', 'maintenanceOff')
    .addSeparator()
    .addItem('Run setup', 'setup')
    .addToUi();
}
function maintenanceOn()  { saveSettings_({ values: { MAINTENANCE_MODE: 'TRUE' } }, 'sheet-menu'); }
function maintenanceOff() { saveSettings_({ values: { MAINTENANCE_MODE: 'FALSE' } }, 'sheet-menu'); }
