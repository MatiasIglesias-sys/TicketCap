import "@/lib/env-check";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { matriculaLookupCandidates } from "@/lib/matricula";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Nro. de Socio o Email", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) return null;

        // Validate lengths to prevent DoS via bcrypt with huge strings
        if (credentials.identifier.length > 254) return null;
        if (credentials.password.length > 72) return null;

        // Rate limit by identifier (IP not available here; use identifier as key)
        const { limited } = rateLimit(
          `login:${credentials.identifier.toLowerCase()}`,
          10,
          15 * 60 * 1000
        );
        if (limited) return null;

        const id = credentials.identifier.trim();

        // Try by email first, then by socio matricula
        let user = await prisma.user.findUnique({
          where: { email: id.toLowerCase() },
          include: { socio: true },
        });

        if (!user) {
          const matriculaCandidates = matriculaLookupCandidates(id);
          const socio = await prisma.socio.findFirst({
            where: {
              OR: matriculaCandidates.map((m) => ({ matricula: m })),
            },
            include: { user: { include: { socio: true } } },
          });
          if (socio?.user) {
            user = socio.user as unknown as typeof user;
          }
        }

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          socio: user.socio
            ? {
                id: user.socio.id,
                matricula: user.socio.matricula,
                categoria: user.socio.categoria,
                cuotaAlDia: user.socio.cuotaAlDia,
                estado: user.socio.estado,
                antiguedad: user.socio.antiguedad,
              }
            : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.socio = (user as any).socio;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.socio = token.socio as any;
      }
      return session;
    },
  },
};
