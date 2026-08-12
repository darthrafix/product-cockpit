import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { figmaGetBoard } from '@/lib/tools/figma';
import {
  adoListWorkItems, adoCreateWorkItem, adoGetWorkItem,
  adoUpdateWorkItem, adoAddComment, adoSearchWorkItems,
} from '@/lib/tools/ado';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: SYSTEM_PROMPT,
    messages,
    maxSteps: 10,
    tools: {
      figma_get_board: tool({
        description: 'Lê o conteúdo do board FigJam da UserX. Use para consultar a documentação de produto, ver as páginas e nós do board.',
        parameters: z.object({
          file_key: z.string().default('xNXQA9D3rmavOPVdaCxG4R').describe('Key do arquivo Figma'),
        }),
        execute: async ({ file_key }) => figmaGetBoard(file_key),
      }),

      ado_list_work_items: tool({
        description: 'Lista work items do Azure DevOps. Use para ver o backlog, parking lot, itens em progresso.',
        parameters: z.object({
          type: z.enum(['Epic', 'Feature', 'Product Backlog Item', 'Task', 'Bug']).optional(),
          tags: z.string().optional().describe("Filtrar por tag, ex: 'parking-lot'"),
          state: z.enum(['New', 'Active', 'Resolved', 'Closed']).optional(),
          limit: z.number().default(20),
        }),
        execute: async (args) => adoListWorkItems(args),
      }),

      ado_create_work_item: tool({
        description: 'Cria um work item no Azure DevOps.',
        parameters: z.object({
          type: z.enum(['Epic', 'Feature', 'Product Backlog Item', 'Task', 'Bug']),
          title: z.string(),
          description: z.string().optional(),
          tags: z.string().optional().describe("Tags separadas por ';'"),
          assigned_to: z.string().optional().describe('Email do responsável'),
        }),
        execute: async (args) => adoCreateWorkItem(args),
      }),

      ado_get_work_item: tool({
        description: 'Retorna detalhes de um work item pelo ID.',
        parameters: z.object({ id: z.number() }),
        execute: async ({ id }) => adoGetWorkItem(id),
      }),

      ado_update_work_item: tool({
        description: 'Atualiza título, descrição, estado ou tags de um work item.',
        parameters: z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          state: z.enum(['New', 'Active', 'Resolved', 'Closed']).optional(),
          tags: z.string().optional(),
        }),
        execute: async (args) => adoUpdateWorkItem(args),
      }),

      ado_add_comment: tool({
        description: 'Adiciona comentário a um work item. Use para registrar decisões de reuniões.',
        parameters: z.object({
          id: z.number(),
          comment: z.string(),
        }),
        execute: async ({ id, comment }) => adoAddComment(id, comment),
      }),

      ado_search_work_items: tool({
        description: 'Busca work items por texto no título ou descrição.',
        parameters: z.object({
          query: z.string(),
          limit: z.number().default(10),
        }),
        execute: async ({ query, limit }) => adoSearchWorkItems(query, limit),
      }),
    },
  });

  return result.toDataStreamResponse();
}
