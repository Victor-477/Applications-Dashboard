import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { readJsonFile, readTextFile } from './fileUtils';

function stripMarkdownInline(value: string) {
  return value.replace(/`([^`]+)`/g, '$1').trim();
}

export function parsePatchSummary(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const summary = {
    title: 'Applications Dashboard Patch Summary',
    description: '',
    currentVersion: '',
    date: '',
    mainArea: '',
    sections: [] as { title: string; items: string[] }[],
  };
  let currentSection: { title: string; items: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('# ')) {
      summary.title = line.replace(/^#\s+/, '').trim();
      continue;
    }

    if (line.startsWith('## ')) {
      const title = line.replace(/^##\s+/, '').trim();
      currentSection = { title, items: [] };
      if (title !== 'Current version') {
        summary.sections.push(currentSection);
      }
      continue;
    }

    if (!currentSection) {
      summary.description = summary.description || line;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    const item = bulletMatch?.[1] || numberedMatch?.[1];
    if (!item) continue;

    if (currentSection.title === 'Current version') {
      const [label, ...valueParts] = item.split(':');
      const value = stripMarkdownInline(valueParts.join(':'));
      if (label === 'Version') summary.currentVersion = value;
      else if (label === 'Date') summary.date = value;
      else if (label === 'Main area') summary.mainArea = value;
      continue;
    }

    currentSection.items.push(item.trim());
  }

  return summary;
}

async function readRecentGitCommitsFallback(panelDir: string) {
  try {
    const headLog = await fs.readFile(path.join(panelDir, '.git', 'logs', 'HEAD'), 'utf-8');
    return headLog
      .split(/\r?\n/)
      .filter(Boolean)
      .reverse()
      .slice(0, 12)
      .map(line => {
        const match = line.match(/^([0-9a-f]{40}) ([0-9a-f]{40}) .*? (\d{10}) [+-]\d{4}\t(?:commit(?: \(.*\))?: )?(.*)$/i);
        if (!match) return undefined;

        const [, , fullHash, timestamp, subject] = match;
        return {
          hash: fullHash.slice(0, 7),
          date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10),
          subject: subject || fullHash.slice(0, 7),
          body: subject || '',
        };
      })
      .filter((commit): commit is { hash: string; date: string; subject: string; body: string } => Boolean(commit));
  } catch {
    return [];
  }
}

export function getRecentGitCommits(panelDir: string) {
  return new Promise<{ hash: string; date: string; subject: string; body: string }[]>((resolve) => {
    const resolveFallback = async () => {
      resolve(await readRecentGitCommitsFallback(panelDir));
    };

    try {
      execFile('git', ['log', '--max-count=12', '--pretty=format:%h%x1f%ad%x1f%s%x1f%b%x1e', '--date=short'], { cwd: panelDir }, (error, stdout) => {
        if (error) {
          resolveFallback();
          return;
        }

        resolve(stdout.split('\x1e').map(record => record.trim()).filter(Boolean).map(record => {
          const [hash, date, subject, ...bodyParts] = record.split('\x1f');
          return {
            hash,
            date,
            subject,
            body: bodyParts.join('\x1f').trim(),
          };
        }));
      });
    } catch {
      resolveFallback();
    }
  });
}

export async function getPatchNotesPayload(paths: {
  panelDir: string;
  packageFile: string;
  patchNotesFile: string;
  patchSummaryFile: string;
}) {
  const packageInfo = await readJsonFile(paths.packageFile, { version: '0.0.0' });
  const notes = await readJsonFile(paths.patchNotesFile, []);
  const patchSummary = parsePatchSummary(await readTextFile(paths.patchSummaryFile));
  const commits = await getRecentGitCommits(paths.panelDir);

  return {
    version: (packageInfo as any).version || '0.0.0',
    notes,
    patchSummary,
    commits,
  };
}
