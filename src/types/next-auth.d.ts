import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      socio: {
        id: string;
        matricula: string;
        categoria: string;
        cuotaAlDia: boolean;
        estado: string;
        antiguedad: number;
      } | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    socio: {
      id: string;
      matricula: string;
      categoria: string;
      cuotaAlDia: boolean;
      estado: string;
      antiguedad: number;
    } | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    socio: {
      id: string;
      matricula: string;
      categoria: string;
      cuotaAlDia: boolean;
      estado: string;
      antiguedad: number;
    } | null;
  }
}
