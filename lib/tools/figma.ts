export async function figmaGetBoard(fileKey: string) {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) return { error: 'FIGMA_ACCESS_TOKEN não configurado' };

  try {
    const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=3`, {
      headers: { 'X-Figma-Token': token },
    });
    if (!res.ok) return { error: `Figma API: ${res.status} ${res.statusText}` };

    const data = await res.json();

    // Extract readable summary from the file tree
    const pages = data.document?.children?.map((page: any) => ({
      id: page.id,
      name: page.name,
      nodes: page.children?.slice(0, 20).map((n: any) => ({
        id: n.id,
        type: n.type,
        name: n.name,
      })) ?? [],
    })) ?? [];

    return {
      name: data.name,
      lastModified: data.lastModified,
      pages,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}
