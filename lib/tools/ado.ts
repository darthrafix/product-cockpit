import { z } from 'zod';

function adoBase() {
  const org = process.env.ADO_ORG;
  const project = process.env.ADO_PROJECT;
  const pat = process.env.ADO_PAT;
  if (!org || !project || !pat) return null;
  const token = Buffer.from(`:${pat}`).toString('base64');
  const base = `https://dev.azure.com/${org}/${project}/_apis`;
  const headers = (patch = false) => ({
    Authorization: `Basic ${token}`,
    'Content-Type': patch ? 'application/json-patch+json' : 'application/json',
  });
  return { base, headers };
}

export async function adoListWorkItems(args: {
  type?: string; tags?: string; state?: string; limit?: number;
}) {
  const ctx = adoBase();
  if (!ctx) return { error: 'Azure DevOps não configurado' };
  const { base, headers } = ctx;

  const conditions = [`[System.TeamProject] = '${process.env.ADO_PROJECT}'`];
  if (args.type) conditions.push(`[System.WorkItemType] = '${args.type}'`);
  if (args.state) conditions.push(`[System.State] = '${args.state}'`);
  if (args.tags) conditions.push(`[System.Tags] Contains '${args.tags}'`);

  const limit = args.limit ?? 20;
  const wiql = `SELECT [System.Id],[System.Title],[System.WorkItemType],[System.State],[System.Tags] FROM WorkItems WHERE ${conditions.join(' AND ')} ORDER BY [System.CreatedDate] DESC`;

  const r1 = await fetch(`${base}/wit/wiql?api-version=7.0&$top=${limit}`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ query: wiql }),
  });
  if (!r1.ok) return { error: await r1.text() };
  const { workItems } = await r1.json();
  if (!workItems?.length) return [];

  const ids = workItems.slice(0, limit).map((w: any) => w.id).join(',');
  const r2 = await fetch(
    `${base}/wit/workitems?ids=${ids}&fields=System.Id,System.Title,System.WorkItemType,System.State,System.Tags&api-version=7.0`,
    { headers: headers() }
  );
  if (!r2.ok) return { error: await r2.text() };
  const { value } = await r2.json();
  return value.map((i: any) => ({
    id: i.id,
    type: i.fields['System.WorkItemType'],
    title: i.fields['System.Title'],
    state: i.fields['System.State'],
    tags: i.fields['System.Tags'] ?? '',
  }));
}

export async function adoCreateWorkItem(args: {
  type: string; title: string; description?: string; tags?: string; assigned_to?: string;
}) {
  const ctx = adoBase();
  if (!ctx) return { error: 'Azure DevOps não configurado' };
  const { base, headers } = ctx;

  const ops: any[] = [{ op: 'add', path: '/fields/System.Title', value: args.title }];
  if (args.description) ops.push({ op: 'add', path: '/fields/System.Description', value: args.description });
  if (args.tags) ops.push({ op: 'add', path: '/fields/System.Tags', value: args.tags });
  if (args.assigned_to) ops.push({ op: 'add', path: '/fields/System.AssignedTo', value: args.assigned_to });

  const r = await fetch(`${base}/wit/workitems/$${args.type}?api-version=7.0`, {
    method: 'POST', headers: headers(true), body: JSON.stringify(ops),
  });
  if (!r.ok) return { error: await r.text() };
  const item = await r.json();
  return { id: item.id, title: item.fields['System.Title'], state: item.fields['System.State'], url: item._links?.html?.href };
}

export async function adoGetWorkItem(id: number) {
  const ctx = adoBase();
  if (!ctx) return { error: 'Azure DevOps não configurado' };
  const { base, headers } = ctx;

  const r = await fetch(`${base}/wit/workitems/${id}?api-version=7.0`, { headers: headers() });
  if (!r.ok) return { error: await r.text() };
  const item = await r.json();
  const f = item.fields;
  const disp = (v: any) => (typeof v === 'object' ? v?.displayName : v) ?? '';
  return {
    id: item.id,
    type: f['System.WorkItemType'],
    title: f['System.Title'],
    description: f['System.Description'] ?? '',
    state: f['System.State'],
    tags: f['System.Tags'] ?? '',
    assigned_to: disp(f['System.AssignedTo']),
    url: item._links?.html?.href,
  };
}

export async function adoUpdateWorkItem(args: {
  id: number; title?: string; description?: string; state?: string; tags?: string;
}) {
  const ctx = adoBase();
  if (!ctx) return { error: 'Azure DevOps não configurado' };
  const { base, headers } = ctx;

  const ops: any[] = [];
  if (args.title) ops.push({ op: 'replace', path: '/fields/System.Title', value: args.title });
  if (args.description) ops.push({ op: 'replace', path: '/fields/System.Description', value: args.description });
  if (args.state) ops.push({ op: 'replace', path: '/fields/System.State', value: args.state });
  if (args.tags) ops.push({ op: 'replace', path: '/fields/System.Tags', value: args.tags });
  if (!ops.length) return { error: 'Nenhum campo para atualizar' };

  const r = await fetch(`${base}/wit/workitems/${args.id}?api-version=7.0`, {
    method: 'PATCH', headers: headers(true), body: JSON.stringify(ops),
  });
  if (!r.ok) return { error: await r.text() };
  const item = await r.json();
  return { id: item.id, title: item.fields['System.Title'], state: item.fields['System.State'], url: item._links?.html?.href };
}

export async function adoAddComment(id: number, comment: string) {
  const ctx = adoBase();
  if (!ctx) return { error: 'Azure DevOps não configurado' };
  const { base, headers } = ctx;

  const r = await fetch(`${base}/wit/workitems/${id}/comments?api-version=7.0-preview.4`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ text: comment }),
  });
  if (!r.ok) return { error: await r.text() };
  const c = await r.json();
  return { comment_id: c.id, work_item_id: id };
}

export async function adoSearchWorkItems(query: string, limit = 10) {
  const ctx = adoBase();
  if (!ctx) return { error: 'Azure DevOps não configurado' };
  const { base, headers } = ctx;

  const q = query.replace(/'/g, "\\'");
  const wiql = `SELECT [System.Id],[System.Title],[System.WorkItemType],[System.State] FROM WorkItems WHERE [System.TeamProject] = '${process.env.ADO_PROJECT}' AND ([System.Title] Contains '${q}' OR [System.Description] Contains '${q}') ORDER BY [System.ChangedDate] DESC`;

  const r1 = await fetch(`${base}/wit/wiql?api-version=7.0&$top=${limit}`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ query: wiql }),
  });
  if (!r1.ok) return { error: await r1.text() };
  const { workItems } = await r1.json();
  if (!workItems?.length) return [];

  const ids = workItems.slice(0, limit).map((w: any) => w.id).join(',');
  const r2 = await fetch(
    `${base}/wit/workitems?ids=${ids}&fields=System.Id,System.Title,System.WorkItemType,System.State,System.Tags&api-version=7.0`,
    { headers: headers() }
  );
  if (!r2.ok) return { error: await r2.text() };
  const { value } = await r2.json();
  return value.map((i: any) => ({
    id: i.id, type: i.fields['System.WorkItemType'],
    title: i.fields['System.Title'], state: i.fields['System.State'],
  }));
}
