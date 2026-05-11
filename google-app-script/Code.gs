var SPREADSHEET_ID = '1vabUWJLgWGP0SRi0RStJ7awgZXzOY6VwVVMCT1ZQawE';
var ANALYSIS_SHEET = 'ANALISIS';
var ESTABLISHMENTS_SHEET = 'ESTABLECIMIENTOS';
var COVERED_2025_SHEET = '2025';

function doGet(e) {
  try {
    var view = (e && e.parameter && e.parameter.view) || 'dashboard';
    var payload = buildDashboardPayload();

    if (view === 'summary') {
      return jsonOutput({ success: true, data: payload.summary, updatedAt: payload.updatedAt });
    }

    return jsonOutput({ success: true, data: payload });
  } catch (error) {
    return jsonOutput({
      success: false,
      message: error && error.message ? error.message : 'Error inesperado al construir la API',
    });
  }
}

function buildDashboardPayload() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var analysisRows = readSheetAsObjects(spreadsheet.getSheetByName(ANALYSIS_SHEET));
  var establishmentRows = readSheetAsObjects(spreadsheet.getSheetByName(ESTABLISHMENTS_SHEET));
  var covered2025Rows = readSheetAsObjects(spreadsheet.getSheetByName(COVERED_2025_SHEET));

  var establishmentsMap = {};
  var covered2025Map = {};
  var covered2025CountMap = {};

  establishmentRows.forEach(function(row) {
    var rbd = normalizeRbd(firstFilledValue(row) || row.rbd || row.codigo_rbd || row.cod_rbd);
    if (!rbd) {
      return;
    }

    getRbdLookupKeys(rbd).forEach(function(key) {
      establishmentsMap[key] = row;
    });
  });

  covered2025Rows.forEach(function(row) {
    var rbd = normalizeRbd(firstFilledValue(row) || row.rbd || row.codigo_rbd || row.cod_rbd);
    if (!rbd) {
      return;
    }

    getRbdLookupKeys(rbd).forEach(function(key) {
      covered2025Map[key] = true;
      covered2025CountMap[key] = (covered2025CountMap[key] || 0) + 1;
    });
  });

  var records = analysisRows
    .map(function(row) {
      var rawRbd = firstFilledValue(row) || row.rbd;
      var rbd = normalizeRbd(rawRbd);
      if (!rbd) {
        return null;
      }

      var establishment = findByRbdLookup(establishmentsMap, rawRbd) || {};
      var outingDeclaration = resolvePedagogicalOutingDeclaration(row);
      var hasPedagogicalOuting = outingDeclaration.hasPedagogicalOuting;
      var observation = pickFirst(row, ['observaciones', 'observacion', 'detalle', 'descripcion']);
      var dimensions = outingDeclaration.dimensions;
      var year = normalizeYear(pickFirst(row, ['ano', 'año', 'year', 'periodo', 'periodo_ano']));
      var paceValue = pickFirst(row, ['pace', 'pace_2026', 'beneficio_pace', 'beneficiado_pace'])
        || pickFirst(establishment, ['pace', 'pace_2026', 'beneficio_pace', 'beneficiado_pace']);
      var actionCount = outingDeclaration.actionCount;
      var estimatedBudget = extractMoney(observation);
      var hasPace2026 = year === '2026' && parseBooleanFlag(paceValue);
      var schoolName = pickFirst(establishment, [
        'nombre_establecimiento',
        'establecimiento',
        'nombre',
        'nom_establecimiento',
        'nom_rbd',
      ]);

      return {
        rbd: rbd,
        name: schoolName || 'Sin dato',
        commune: pickFirst(establishment, ['comuna', 'nom_com', 'com']) || 'Sin dato',
        dependency: pickFirst(establishment, ['dependencia', 'dependencia_administrativa', 'tipo_dependencia']) || 'Sin dato',
        level: pickFirst(establishment, ['nivel', 'nivel_ensenanza', 'enseñanza', 'ensenanza', 'tipo']) || 'Sin dato',
        area: pickFirst(establishment, ['area_geografica', 'area', 'zona']) || 'Sin dato',
        rurality: pickFirst(establishment, ['ruralidad', 'rural', 'urbano_rural', 'rural_urbano']) || 'Sin dato',
        year: year,
        hasPace2026: hasPace2026,
        wasCovered2025: hasRbdLookupMatch(covered2025Map, rawRbd),
        covered2025Count: getRbdLookupCount(covered2025CountMap, rawRbd),
        hasPedagogicalOuting: hasPedagogicalOuting,
        actionCount: actionCount,
        dimensions: dimensions,
        observation: observation || 'Sin observaciones',
        estimatedBudget: estimatedBudget,
        analysisRaw: row,
        establishmentRaw: establishment,
      };
    })
    .filter(function(item) {
      return item !== null;
    });

  var dimensionsCatalog = uniqueFlat(records.map(function(item) {
    return item.dimensions;
  }));
  var yearsCatalog = uniqueFlat(records.map(function(item) {
    return [item.year];
  }));
  var totalUniqueEstablishments = countUniqueEstablishments(records);

  var yearSummary = yearsCatalog.map(function(year) {
    var yearRecords = records.filter(function(item) {
      return item.year === year;
    });

    return {
      year: year,
      totalEstablishments: countUniqueEstablishments(yearRecords),
      withOutings: yearRecords.filter(function(item) {
        return item.hasPedagogicalOuting;
      }).length,
      withoutOutings: yearRecords.filter(function(item) {
        return !item.hasPedagogicalOuting;
      }).length,
      totalActions: yearRecords.reduce(function(acc, item) {
        return acc + item.actionCount;
      }, 0),
      estimatedBudget: yearRecords.reduce(function(acc, item) {
        return acc + item.estimatedBudget;
      }, 0),
    };
  });

  var summary = {
    totalEstablishments: totalUniqueEstablishments,
    withOutings: records.filter(function(item) {
      return item.hasPedagogicalOuting;
    }).length,
    withoutOutings: records.filter(function(item) {
      return !item.hasPedagogicalOuting;
    }).length,
    totalActions: records.reduce(function(acc, item) {
      return acc + item.actionCount;
    }, 0),
    estimatedBudget: records.reduce(function(acc, item) {
      return acc + item.estimatedBudget;
    }, 0),
  };

  return {
    spreadsheetId: SPREADSHEET_ID,
    updatedAt: new Date().toISOString(),
    catalogs: {
      dimensions: dimensionsCatalog,
      years: yearsCatalog,
    },
    summary: summary,
    yearSummary: yearSummary,
    establishments: records,
  };
}

function countUniqueEstablishments(records) {
  var bucket = {};

  (records || []).forEach(function(item) {
    if (!item || !item.rbd) {
      return;
    }

    bucket[item.rbd] = true;
  });

  return Object.keys(bucket).length;
}

function readSheetAsObjects(sheet) {
  if (!sheet) {
    throw new Error('No se encontró una de las hojas requeridas en el Spreadsheet');
  }

  var values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) {
    return [];
  }

  var headers = values[0].map(function(header, index) {
    var normalized = slugifyHeader(header);
    if (normalized) {
      return normalized;
    }

    return 'column_' + (index + 1);
  });

  return values.slice(1).map(function(row) {
    var item = {};
    headers.forEach(function(header, index) {
      item[header] = row[index] !== undefined ? String(row[index]).trim() : '';
    });
    return item;
  }).filter(function(item) {
    return Object.keys(item).some(function(key) {
      return item[key] !== '';
    });
  });
}

function slugifyHeader(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeRbd(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^0-9K-]/g, '');
}

function getRbdLookupKeys(value) {
  var raw = String(value || '').toUpperCase().replace(/\s+/g, '');
  var normalized = normalizeRbd(raw);
  var bucket = {};

  if (!normalized) {
    return [];
  }

  bucket[normalized] = true;
  bucket[normalized.replace(/-/g, '')] = true;

  if (normalized.indexOf('-') >= 0) {
    bucket[normalized.split('-')[0]] = true;
  } else if (/[K]$/.test(raw)) {
    bucket[normalized.slice(0, -1)] = true;
  }

  return Object.keys(bucket).filter(function(item) {
    return item;
  });
}

function findByRbdLookup(source, value) {
  var keys = getRbdLookupKeys(value);

  for (var index = 0; index < keys.length; index += 1) {
    if (source[keys[index]]) {
      return source[keys[index]];
    }
  }

  return null;
}

function hasRbdLookupMatch(source, value) {
  return Boolean(findByRbdLookup(source, value));
}

function getRbdLookupCount(source, value) {
  var match = findByRbdLookup(source, value);
  return match ? Number(match) || 0 : 0;
}

function firstFilledValue(row) {
  var keys = Object.keys(row || {});
  if (!keys.length) {
    return '';
  }

  return row[keys[0]] || '';
}

function pickFirst(source, keys) {
  if (!source) {
    return '';
  }

  for (var index = 0; index < keys.length; index += 1) {
    var key = keys[index];
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
      return String(source[key]).trim();
    }
  }

  return '';
}

function resolvePedagogicalOutingDeclaration(row) {
  var hasDeclaredOuting = parseBooleanFlag(
    pickFirst(row, ['si', 'salidas', 'tiene_salida', 'tiene_salidas', 'salida_pedagogica'])
  );

  if (!hasDeclaredOuting) {
    return {
      hasPedagogicalOuting: false,
      dimensions: [],
      actionCount: 0,
    };
  }

  return {
    hasPedagogicalOuting: true,
    dimensions: extractDimensions(pickFirst(row, ['dimension', 'dimensión', 'area', 'área'])),
    actionCount: parseNumber(pickFirst(row, ['n_acciones', 'n_accion', 'numero_acciones', 'acciones', 'n_acciones_'])) || 0,
  };
}

function parseBooleanFlag(value) {
  var normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return ['si', 's', 'yes', 'true', '1'].indexOf(normalized) >= 0;
}

function parseNumber(value) {
  var normalized = String(value || '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .match(/-?\d+(?:\.\d+)?/);

  return normalized ? Number(normalized[0]) : 0;
}

function normalizeYear(value) {
  var match = String(value || '').match(/20\d{2}/);
  return match ? match[0] : 'Sin año';
}

function extractDimensions(value) {
  return uniqueFlat([
    String(value || '')
      .split(/\s*[-\/;,]\s*/)
      .map(function(item) {
        return normalizeDimensionLabel(item);
      })
      .filter(function(item) {
        return item && item !== '-';
      }),
  ]);
}

function extractMoney(text) {
  var matches = String(text || '')
    .replace(/\$\$/g, '$')
    .match(/\$\s*[0-9][0-9.,]*/g);

  if (!matches) {
    return 0;
  }

  return matches.reduce(function(total, chunk) {
    var cleaned = String(chunk)
      .replace(/\$/g, '')
      .replace(/\s+/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '');

    return total + (Number(cleaned) || 0);
  }, 0);
}

function normalizeDimensionLabel(value) {
  var raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  var key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  var canonicalMap = {
    liderazgo: 'Liderazgo',
    'convivencia escolar': 'Convivencia Escolar',
    'convivencia educativa': 'Convivencia Educativa',
    'gestion pedagogica': 'Gestión Pedagógica',
    'gestion de recursos': 'Gestión de Recursos',
    'gestion de la convivencia educativa': 'Gestión de la Convivencia Educativa',
  };

  if (canonicalMap[key]) {
    return canonicalMap[key];
  }

  return key
    .split(' ')
    .map(function(word) {
      return word ? word.charAt(0).toUpperCase() + word.slice(1) : '';
    })
    .join(' ')
    .trim();
}

function uniqueFlat(groups) {
  var bucket = {};
  groups.forEach(function(items) {
    (items || []).forEach(function(item) {
      if (!item) {
        return;
      }

      bucket[item] = true;
    });
  });

  return Object.keys(bucket).sort();
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}