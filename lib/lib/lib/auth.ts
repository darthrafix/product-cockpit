import type { AuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

export type Role = 'admin' | 'member' | 'viewer';

export const TOOL_PERMISSIONS: Record<Role, string[]> = {
  admin: ['figma_get_board','ado_list_work_items','ado_get_work_item','ado_create_work_item','ado_update_work_item','ado_add_comment','ado_search_work_items'],
  member: ['figma_get_board','ado_list_work_items','ado_get_work_item','ado_add_comment','ado_search_work_items'],
  viewer: ['figma_get_board','ado_list_work_items','ado_get_work_item'],
};

export function getRole(email: string): Role {
  const normalize = (s: string) => s.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const admins = normalize(process.env.ADMIN_EMAILS ?? '');
  const members = normalize(process.env.MEMBER_EMAILS ?? '');
  const e = email.toLowerCase();
  if (admins.includes(e)) return 'admin';
  if (members.includes(e)) return 'member';
  return 'viewer';
}

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email) { token.role = getRole(profile.email); }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).role = token.role; }
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
