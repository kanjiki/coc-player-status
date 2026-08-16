const SPREADSHEET_ID = '1O-6QK5tdJo5WDeS9Ve69hX84wyXKWZJuiI-v7oQ7MyU';
const SCHEMA_VERSION = 1;

function doGet() {
  return jsonResponse_({ ok: true, service: 'coc-player-status receiver', schemaVersion: SCHEMA_VERSION });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (!body) return jsonResponse_({ ok: false, error: 'empty_body' });

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      return jsonResponse_({ ok: false, error: 'invalid_json' });
    }

    if (payload.schemaVersion !== SCHEMA_VERSION) {
      return jsonResponse_({ ok: false, error: 'unsupported_schema' });
    }
    if (!payload.sessionId || typeof payload.sessionId !== 'string') {
      return jsonResponse_({ ok: false, error: 'missing_session_id' });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const now = new Date();

    if (payload.event === 'diagnosis_completed') {
      saveCompletedDiagnosis_(ss, payload, now);
      return jsonResponse_({ ok: true, saved: 'diagnosis_completed' });
    }

    if (payload.event === 'optional_survey') {
      saveSurvey_(ss, payload, now);
      return jsonResponse_({ ok: true, saved: 'optional_survey' });
    }

    saveFunnel_(ss, payload, now);
    return jsonResponse_({ ok: true, saved: 'funnel_event' });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({ ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }
}

function saveCompletedDiagnosis_(ss, payload, now) {
  const sheet = requiredSheet_(ss, 'Responses');
  const abilities = abilityMap_(payload.abilities || []);
  const state = payload.finalState || {};
  const story = state.story || {};
  const mythos = state.mythos || {};
  const kuramochi = state.kuramochi || {};
  const history = Array.isArray(payload.history) ? payload.history : [];
  const ending = payload.ending || {};

  const row = [
    now,
    payload.sessionId,
    payload.appVersion || '',
    payload.schemaVersion || '',
    payload.startedAt || '',
    payload.completedAt || payload.recordedAt || '',
    payload.durationSec ?? '',
    ending.id || '',
    ending.title || '',
    valueOfAbility_(abilities, 'STR'),
    valueOfAbility_(abilities, 'CON'),
    valueOfAbility_(abilities, 'SIZ'),
    valueOfAbility_(abilities, 'DEX'),
    valueOfAbility_(abilities, 'APP'),
    valueOfAbility_(abilities, 'INT'),
    valueOfAbility_(abilities, 'POW'),
    valueOfAbility_(abilities, 'EDU'),
    valueOfAbility_(abilities, 'SAN'),
    valueOfAbility_(abilities, 'LUCK'),
    mythos.houndStage ?? '',
    story.routes && story.routes.finalScope ? story.routes.finalScope : '',
    kuramochi.state || '',
    kuramochi.fixedVariant || '',
    kuramochi.multipleFixation === true,
    history.length,
    '',
    '',
    safeJson_(payload.abilities || []),
    safeJson_(state.diagnostic || {}),
    safeJson_({ story: story, observer: state.observer || {}, mythos: mythos, kuramochi: kuramochi }),
    '1.0',
    ''
  ];

  upsertByResponseId_(sheet, payload.sessionId, row, 2);
  saveSceneResponses_(ss, payload, now);
}

function saveSceneResponses_(ss, payload, now) {
  const sheet = requiredSheet_(ss, 'SceneResponses');
  const history = Array.isArray(payload.history) ? payload.history : [];
  if (!history.length) return;

  const existing = existingSceneKeys_(sheet, payload.sessionId);
  const rows = [];
  history.forEach(function(entry, index) {
    const key = payload.sessionId + '|' + index + '|' + (entry.slotId || '');
    if (existing.has(key)) return;
    rows.push([
      now,
      payload.sessionId,
      payload.appVersion || '',
      index + 1,
      entry.slotId || '',
      entry.sceneVariantId || '',
      entry.selectedChoiceId || '',
      entry.response && entry.response.kind ? entry.response.kind : 'choice',
      entry.diceRoll ?? '',
      entry.diceSuccess === undefined ? '' : entry.diceSuccess,
      '',
      entry.response && entry.response.axisEvidence ? safeJson_(entry.response.axisEvidence) : '',
      entry.response ? safeJson_(entry.response) : '',
      safeJson_(entry.visibleChoiceIds || []),
      entry.durationMs ?? '',
      '',
      '',
      ''
    ]);
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function saveSurvey_(ss, payload, now) {
  const sheet = requiredSheet_(ss, 'Survey');
  const survey = payload.survey || {};
  const row = [
    now,
    payload.sessionId,
    payload.appVersion || '',
    survey.cocExperience || '',
    survey.plExperience || '',
    survey.kpExperience || '',
    survey.scenarioCreationExperience || '',
    '',
    '1.0',
    ''
  ];
  upsertByResponseId_(sheet, payload.sessionId, row, 2);
}

function saveFunnel_(ss, payload, now) {
  const sheet = requiredSheet_(ss, 'Funnel');
  sheet.appendRow([
    now,
    payload.sessionId || '',
    payload.appVersion || '',
    payload.event || 'unknown',
    payload.sceneIndex ?? '',
    payload.slotId || '',
    payload.elapsedSec ?? '',
    payload.deviceClass || '',
    payload.referrerClass || '',
    ''
  ]);
}

function abilityMap_(abilities) {
  const map = {};
  abilities.forEach(function(item) {
    if (item && item.id) map[item.id] = item;
  });
  return map;
}

function valueOfAbility_(map, id) {
  return map[id] && map[id].value !== undefined ? map[id].value : '';
}

function requiredSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function upsertByResponseId_(sheet, responseId, row, responseIdColumn) {
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, responseIdColumn, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < values.length; i += 1) {
      if (values[i][0] === responseId) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return;
      }
    }
  }
  sheet.appendRow(row);
}

function existingSceneKeys_(sheet, responseId) {
  const keys = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return keys;
  const values = sheet.getRange(2, 2, lastRow - 1, 4).getDisplayValues();
  values.forEach(function(r) {
    if (r[0] === responseId) keys.add(r[0] + '|' + (Number(r[2]) - 1) + '|' + r[3]);
  });
  return keys;
}

function safeJson_(value) {
  try { return JSON.stringify(value); } catch (error) { return ''; }
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
