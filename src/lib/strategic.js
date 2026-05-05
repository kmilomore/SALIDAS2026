function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeRurality(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return 'Sin dato';
  }

  if (normalized.includes('rural')) {
    return 'Rural';
  }

  if (normalized.includes('urb')) {
    return 'Urbano';
  }

  return 'Sin dato';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getYearWeight(value) {
  const match = String(value || '').match(/20\d{2}/);
  return match ? Number(match[0]) : -1;
}

function getReferenceYear(records, planningYear) {
  const availableYears = [...new Set((records || []).map((item) => item?.year).filter(Boolean))];

  if (availableYears.includes(planningYear)) {
    return planningYear;
  }

  return availableYears.sort((left, right) => getYearWeight(right) - getYearWeight(left))[0] || planningYear;
}

function getPriorityLabel(score) {
  if (score >= 70) {
    return 'Alta';
  }

  if (score >= 45) {
    return 'Media';
  }

  return 'Baja';
}

function buildRecommendation(profile) {
  if (!profile.hasPlanningYearRecord) {
    return 'Sin registro PME del año';
  }

  if (!profile.hasPmeResources) {
    return 'No tramitable sin recursos PME';
  }

  if (!profile.pendingThisYear && profile.score < 55) {
    return 'Postergar';
  }

  if (!profile.wasCovered2025 && profile.pendingThisYear && profile.hasPmeResources) {
    return 'Priorizar por no cobertura 2025';
  }

  if (profile.pendingThisYear && profile.score >= 65) {
    return 'Asignar este año';
  }

  if (profile.score >= 50) {
    return 'Prioridad media';
  }

  return 'Postergar';
}

function scoreProfile(profile, context, strategy) {
  const communeCoverage = context.communes[profile.commune] || { coverageRate: 0 };
  const ruralCoverage = context.ruralities[profile.ruralityGroup] || { coverageRate: 0 };
  const normalizedActions = clamp(profile.actionsForPlanningYear / 8, 0, 1);
  const missingRecordPenalty = profile.hasPlanningYearRecord ? 0 : -12;
  const resourcePenalty = profile.hasPmeResources ? 0 : -30;
  const pendingScore = profile.pendingThisYear ? 30 : 6;
  const noCoverage2025Score = profile.wasCovered2025 ? 0 : 22;
  const ruralScore = profile.ruralityGroup === 'Rural' ? 14 : 4;
  const communeGapScore = (1 - communeCoverage.coverageRate) * 18;
  const ruralGapScore = (1 - ruralCoverage.coverageRate) * 12;
  const actionsScore = normalizedActions * 18;

  const strategyWeights = {
    coverage: { pending: 1.15, noCoverage2025: 1.5, rural: 0.8, communeGap: 1, ruralGap: 0.8, actions: 0.8 },
    rural: { pending: 1.05, noCoverage2025: 1.3, rural: 1.8, communeGap: 0.9, ruralGap: 1.5, actions: 0.75 },
    balance: { pending: 1.05, noCoverage2025: 1.35, rural: 1, communeGap: 1.8, ruralGap: 1.1, actions: 0.8 },
    need: { pending: 1.35, noCoverage2025: 1.45, rural: 1, communeGap: 1.15, ruralGap: 1, actions: 1.45 },
    lowBudget: { pending: 1.1, noCoverage2025: 1.25, rural: 0.85, communeGap: 1, ruralGap: 0.9, actions: 0.75 },
  };

  const weights = strategyWeights[strategy] || strategyWeights.coverage;
  const score = clamp(
    pendingScore * weights.pending
      + noCoverage2025Score * weights.noCoverage2025
      + ruralScore * weights.rural
      + communeGapScore * weights.communeGap
      + ruralGapScore * weights.ruralGap
      + actionsScore * weights.actions
      + missingRecordPenalty,
      + resourcePenalty,
    0,
    100,
  );

  const reasons = [];

  if (profile.pendingThisYear) {
    reasons.push('Pendiente del año en planificación');
  }

  if (!profile.wasCovered2025) {
    reasons.push('No fue cubierta en 2025');
  }

  if (profile.ruralityGroup === 'Rural') {
    reasons.push('Prioridad territorial rural');
  }

  if (communeCoverage.coverageRate < 0.5) {
    reasons.push('Comuna con baja cobertura');
  }

  if (profile.actionsForPlanningYear >= 3) {
    reasons.push('Alta intensidad de acciones');
  }

  if (!profile.hasPlanningYearRecord) {
    reasons.push('Sin registro del año activo');
  }

  if (profile.hasPlanningYearRecord && !profile.hasPmeResources) {
    reasons.push('Sin recursos asociados en PME');
  }

  return {
    score: Math.round(score),
    priority: getPriorityLabel(score),
    reasons: reasons.slice(0, 3),
  };
}

export function resolvePlanningYear(years, selectedYear) {
  if (selectedYear && selectedYear !== 'auto') {
    return selectedYear;
  }

  const numericYears = (years || []).filter((item) => /^20\d{2}$/.test(String(item))).sort();

  if (numericYears.length) {
    return numericYears[numericYears.length - 1];
  }

  return (years || [])[0] || 'Sin año';
}

export function buildStrategicProfiles(records, planningYear, strategy = 'coverage') {
  const buckets = new Map();

  (records || []).forEach((item) => {
    if (!item?.rbd) {
      return;
    }

    const existing = buckets.get(item.rbd) || {
      rbd: item.rbd,
      name: item.name,
      commune: item.commune || 'Sin dato',
      dependency: item.dependency || 'Sin dato',
      level: item.level || 'Sin dato',
      area: item.area || 'Sin dato',
      rurality: item.rurality || 'Sin dato',
      ruralityGroup: normalizeRurality(item.rurality),
      dimensions: new Set(),
      totalActions: 0,
      totalBudget: 0,
      totalRecords: 0,
      actionsForPlanningYear: 0,
      estimatedBudgetForPlanningYear: 0,
      hasPlanningYearRecord: false,
      hasPmeResources: false,
      wasCovered2025: false,
      hasOutingThisYear: false,
      hasOutingAnyYear: false,
      records: [],
    };

    item.dimensions.forEach((dimension) => existing.dimensions.add(dimension));
    existing.totalActions += Number(item.actionCount) || 0;
    existing.totalBudget += Number(item.estimatedBudget) || 0;
    existing.totalRecords += 1;
    existing.wasCovered2025 = existing.wasCovered2025 || Boolean(item.wasCovered2025);
    existing.hasOutingAnyYear = existing.hasOutingAnyYear || Boolean(item.hasPedagogicalOuting);
    existing.records.push(item);

    if (item.year === planningYear) {
      existing.hasPlanningYearRecord = true;
      existing.hasOutingThisYear = existing.hasOutingThisYear || Boolean(item.hasPedagogicalOuting);
      existing.actionsForPlanningYear += Number(item.actionCount) || 0;
      existing.estimatedBudgetForPlanningYear += Number(item.estimatedBudget) || 0;
    }

    buckets.set(item.rbd, existing);
  });

  const profiles = [...buckets.values()].map((item) => {
    const referenceYear = getReferenceYear(item.records, planningYear);
    const referenceRecords = item.records.filter((record) => record.year === referenceYear);
    const actionsForReferenceYear = referenceRecords.reduce((sum, record) => sum + (Number(record.actionCount) || 0), 0);
    const estimatedBudgetForReferenceYear = referenceRecords.reduce((sum, record) => sum + (Number(record.estimatedBudget) || 0), 0);
    const hasOutingReferenceYear = referenceRecords.some((record) => Boolean(record.hasPedagogicalOuting));
    const hasReferenceYearRecord = referenceRecords.length > 0;

    return {
      ...item,
      dimensions: [...item.dimensions].sort(),
      referenceYear,
      hasPlanningYearRecord: item.hasPlanningYearRecord,
      hasReferenceYearRecord,
      actionsForPlanningYear: actionsForReferenceYear,
      estimatedBudgetForPlanningYear: estimatedBudgetForReferenceYear,
      hasOutingThisYear: hasOutingReferenceYear,
      hasPmeResources: estimatedBudgetForReferenceYear > 0,
      pendingThisYear: estimatedBudgetForReferenceYear > 0 && !hasOutingReferenceYear,
      blockedByMissingBudget: hasReferenceYearRecord && estimatedBudgetForReferenceYear <= 0,
      isUsingFallbackYear: referenceYear !== planningYear,
    };
  });

  const communeBuckets = {};
  const ruralityBuckets = {};
  let maxBudget = 0;

  profiles.forEach((profile) => {
    const communeKey = profile.commune || 'Sin dato';
    const ruralityKey = profile.ruralityGroup;

    if (!communeBuckets[communeKey]) {
      communeBuckets[communeKey] = {
        total: 0,
        withBudget: 0,
        withoutBudget: 0,
        withOuting: 0,
        withoutOuting: 0,
        estimatedBudget: 0,
      };
    }

    if (!ruralityBuckets[ruralityKey]) {
      ruralityBuckets[ruralityKey] = {
        total: 0,
        withBudget: 0,
        withoutBudget: 0,
        withOuting: 0,
        withoutOuting: 0,
        estimatedBudget: 0,
      };
    }

    communeBuckets[communeKey].total += 1;
    ruralityBuckets[ruralityKey].total += 1;

    if (profile.hasPmeResources) {
      communeBuckets[communeKey].withBudget += 1;
      ruralityBuckets[ruralityKey].withBudget += 1;
    } else {
      communeBuckets[communeKey].withoutBudget += 1;
      ruralityBuckets[ruralityKey].withoutBudget += 1;
    }

    if (profile.pendingThisYear) {
      communeBuckets[communeKey].withoutOuting += 1;
      ruralityBuckets[ruralityKey].withoutOuting += 1;
    } else {
      communeBuckets[communeKey].withOuting += 1;
      ruralityBuckets[ruralityKey].withOuting += 1;
    }

    communeBuckets[communeKey].estimatedBudget += profile.estimatedBudgetForPlanningYear;
    ruralityBuckets[ruralityKey].estimatedBudget += profile.estimatedBudgetForPlanningYear;
    maxBudget = Math.max(maxBudget, profile.estimatedBudgetForPlanningYear);
  });

  Object.values(communeBuckets).forEach((bucket) => {
    bucket.coverageRate = bucket.withBudget ? bucket.withOuting / bucket.withBudget : 0;
  });

  Object.values(ruralityBuckets).forEach((bucket) => {
    bucket.coverageRate = bucket.withBudget ? bucket.withOuting / bucket.withBudget : 0;
  });

  const context = {
    communes: communeBuckets,
    ruralities: ruralityBuckets,
  };

  const scoredProfiles = profiles
    .map((profile) => {
      const scoring = scoreProfile(profile, context, strategy);
      const enriched = {
        ...profile,
        ...scoring,
      };

      return {
        ...enriched,
        recommendation: buildRecommendation(enriched),
      };
    })
    .sort((left, right) => right.score - left.score || right.actionsForPlanningYear - left.actionsForPlanningYear);

  return {
    profiles: scoredProfiles,
    communeCoverage: Object.entries(communeBuckets)
      .map(([name, bucket]) => ({ name, ...bucket }))
      .sort((left, right) => (left.coverageRate - right.coverageRate) || (right.withoutOuting - left.withoutOuting)),
    ruralityCoverage: Object.entries(ruralityBuckets)
      .map(([name, bucket]) => ({ name, ...bucket }))
      .sort((left, right) => left.coverageRate - right.coverageRate),
  };
}

export function getStrategyLabel(strategy) {
  const labels = {
    coverage: 'Maximizar cobertura',
    rural: 'Priorizar rurales',
    balance: 'Equilibrar comunas',
    need: 'Priorizar mayor necesidad',
    lowBudget: 'Priorizar menor inversión previa',
  };

  return labels[strategy] || labels.coverage;
}