// Se ejecuta antes de cargar los módulos de test (setupFiles)
// para que las variables de entorno estén disponibles al importar módulos.
process.env.QR_SECRET = process.env.QR_SECRET || "test-secret-for-jest";
