import type { QueryParams, SystemLogEntry } from './types';

function csvEscape(value: string) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function getSystemLogsForExport(logs: SystemLogEntry[], query: QueryParams) {
  const source = String(query.source || 'all');
  const limit = Number(query.limit);
  let filteredLogs = logs.filter(log => source === 'all' || log.source === source);

  if (Number.isInteger(limit) && limit > 0) {
    filteredLogs = filteredLogs.slice(-limit);
  }

  return filteredLogs;
}

export function serializeSystemLogs(logs: SystemLogEntry[], format: string) {
  const normalizedFormat = ['csv', 'txt', 'json', 'ndjson', 'log'].includes(format) ? format : 'csv';

  if (normalizedFormat === 'json') {
    return {
      body: JSON.stringify(logs, null, 2),
      contentType: 'application/json; charset=utf-8',
      extension: 'json',
    };
  }

  if (normalizedFormat === 'ndjson') {
    return {
      body: logs.map(log => JSON.stringify(log)).join('\n'),
      contentType: 'application/x-ndjson; charset=utf-8',
      extension: 'ndjson',
    };
  }

  if (normalizedFormat === 'txt') {
    return {
      body: logs.map(log => `${log.timestamp}\t${log.type}\t${log.source}\t${log.message}`).join('\n'),
      contentType: 'text/plain; charset=utf-8',
      extension: 'txt',
    };
  }

  if (normalizedFormat === 'log') {
    return {
      body: logs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] [${log.source}] ${log.message}`).join('\n'),
      contentType: 'text/plain; charset=utf-8',
      extension: 'log',
    };
  }

  const rows = [
    ['timestamp', 'type', 'source', 'message'],
    ...logs.map(log => [log.timestamp, log.type, log.source, log.message])
  ];

  return {
    body: rows.map(row => row.map(csvEscape).join(',')).join('\n'),
    contentType: 'text/csv; charset=utf-8',
    extension: 'csv',
  };
}

export function clearExportedSystemLogs(systemLogHistory: SystemLogEntry[], exportedLogs: SystemLogEntry[]) {
  const exportedIds = new Set(exportedLogs.map(log => log.id));
  for (let index = systemLogHistory.length - 1; index >= 0; index -= 1) {
    if (exportedIds.has(systemLogHistory[index].id)) {
      systemLogHistory.splice(index, 1);
    }
  }
}
