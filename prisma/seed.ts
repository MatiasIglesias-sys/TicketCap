import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateMatchBanner } from "../src/lib/banner";

const prisma = new PrismaClient();

// ── Sectores ──────────────────────────────────────────────────────────────────

function sectoresApertura(eventId: string, pMin = 500, pMax = 1200) {
  return [
    { eventId, nombre: "Tr. Güelfi — Popular", tipo: "POPULAR", capacidad: 8380, disponibles: 6800, precio: pMin, precioSocio: 0 },
    { eventId, nombre: "Tr. Cataldi — Popular Oeste", tipo: "POPULAR", capacidad: 8380, disponibles: 7000, precio: pMin, precioSocio: 0 },
    { eventId, nombre: "Tr. Damiani — Platea Familiar", tipo: "PLATEA_FAMILIAR", capacidad: 6200, disponibles: 4800, precio: Math.round(pMin * 1.3), precioSocio: 0, esFamiliar: true },
    { eventId, nombre: "Tr. Güelfi — Sector Visitante", tipo: "PLATEA_VISITANTE", capacidad: 2141, disponibles: 1600, precio: Math.round(pMin * 1.5), precioSocio: Math.round(pMin * 1.5), esVisitante: true },
    { eventId, nombre: "T. Henderson — Platea VIP", tipo: "PLATEA_VIP", capacidad: 5000, disponibles: 3200, precio: pMax, precioSocio: 0 },
    { eventId, nombre: "Palcos VIP — Henderson", tipo: "PALCO_VIP", capacidad: 107, disponibles: 45, precio: pMax * 12, precioSocio: Math.round(pMax * 10) },
  ];
}

function sectoresCopa(eventId: string) {
  return [
    { eventId, nombre: "Tr. Güelfi — Popular", tipo: "POPULAR", capacidad: 8380, disponibles: 4200, precio: 1200, precioSocio: 600 },
    { eventId, nombre: "Tr. Cataldi — Popular Oeste", tipo: "POPULAR", capacidad: 8380, disponibles: 3800, precio: 1200, precioSocio: 600 },
    { eventId, nombre: "Tr. Damiani — Platea Familiar", tipo: "PLATEA_FAMILIAR", capacidad: 6200, disponibles: 2600, precio: 1800, precioSocio: 900, esFamiliar: true },
    { eventId, nombre: "Tr. Güelfi — Sector Visitante", tipo: "PLATEA_VISITANTE", capacidad: 2141, disponibles: 800, precio: 2200, precioSocio: 2200, esVisitante: true },
    { eventId, nombre: "T. Henderson — Platea VIP", tipo: "PLATEA_VIP", capacidad: 5000, disponibles: 1800, precio: 2800, precioSocio: 1500 },
    { eventId, nombre: "Palcos VIP — Henderson", tipo: "PALCO_VIP", capacidad: 107, disponibles: 12, precio: 35000, precioSocio: 28000 },
  ];
}

function sectoresBasquet(eventId: string) {
  return [
    { eventId, nombre: "Platea Alta", tipo: "POPULAR", capacidad: 2000, disponibles: 1400, precio: 350, precioSocio: 0 },
    { eventId, nombre: "Platea Baja", tipo: "PLATEA_VIP", capacidad: 1500, disponibles: 900, precio: 650, precioSocio: 0 },
    { eventId, nombre: "Palcos VIP", tipo: "PALCO_VIP", capacidad: 120, disponibles: 50, precio: 2500, precioSocio: 2000 },
  ];
}

function sectoresRugby(eventId: string) {
  return [
    { eventId, nombre: "Popular General", tipo: "POPULAR", capacidad: 5000, disponibles: 5000, precio: 300, precioSocio: 0 },
    { eventId, nombre: "Platea", tipo: "PLATEA_VIP", capacidad: 3000, disponibles: 3000, precio: 600, precioSocio: 0 },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding TicketsCap...");

  // ── El seed NO borra eventos ni sectores creados por admins ─────────────────
  // Solo limpia tickets/orders/queue de los usuarios de prueba
  console.log("ℹ️  Seed seguro — los eventos creados por admins se conservan");

  // ── Usuarios y socios (upsert — no se pierden) ──────────────────────────────
  const socio1 = await prisma.socio.upsert({
    where: { matricula: "CAP-001234" },
    update: {},
    create: { matricula: "CAP-001234", nombre: "Carlos Rodríguez", ci: "12345678", categoria: "ACTIVO", estado: "AL_DIA", cuotaAlDia: true, antiguedad: 15 },
  });
  const socio2 = await prisma.socio.upsert({
    where: { matricula: "CAP-005678" },
    update: {},
    create: { matricula: "CAP-005678", nombre: "María González", ci: "23456789", categoria: "ADHERENTE", estado: "AL_DIA", cuotaAlDia: true, antiguedad: 3 },
  });
  await prisma.socio.upsert({
    where: { matricula: "CAP-009999" },
    update: {},
    create: { matricula: "CAP-009999", nombre: "Jorge Pereira", ci: "34567890", categoria: "SUSCRIPTOR", estado: "MOROSO", cuotaAlDia: false, antiguedad: 8 },
  });

  const hashPass  = await bcrypt.hash("penarol2026", 10);
  const hashAdmin = await bcrypt.hash("admin2026", 10);

  await prisma.user.upsert({ where: { email: "admin@ticketscap.com.uy" }, update: {}, create: { email: "admin@ticketscap.com.uy", password: hashAdmin, name: "Administrador TicketsCap", role: "ADMIN", phoneVerified: true } });
  await prisma.user.upsert({ where: { email: "carlos@example.com" }, update: {}, create: { email: "carlos@example.com", password: hashPass, name: "Carlos Rodríguez", ci: "12345678", phone: "098123456", phoneVerified: true, role: "HINCHA", socioId: socio1.id } });
  await prisma.user.upsert({ where: { email: "maria@example.com" }, update: {}, create: { email: "maria@example.com", password: hashPass, name: "María González", ci: "23456789", phone: "091234567", phoneVerified: true, role: "HINCHA", socioId: socio2.id } });
  await prisma.user.upsert({ where: { email: "hincha@example.com" }, update: {}, create: { email: "hincha@example.com", password: hashPass, name: "Pedro Techera", ci: "45678901", phone: "092345678", phoneVerified: true, role: "HINCHA" } });
  await prisma.user.upsert({ where: { email: "portero@ticketscap.com.uy" }, update: {}, create: { email: "portero@ticketscap.com.uy", password: hashAdmin, name: "Scanner Estadio", role: "PORTERO", phoneVerified: true } });


  console.log("✅ Seed completo — solo usuarios y socios de prueba");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
