import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Asegurando usuario administrador en la nube...");

  // 1. Encriptar la contraseña de nuevo para estar seguros
  const passwordHash = await bcrypt.hash('pass_seguro_123', 10);

  // 2. Usar upsert: "Si existe, actualiza la contraseña. Si no, créalo."
  const user = await prisma.user.upsert({
    where: { email: 'jefe@tienda.com' },
    update: {
      password: passwordHash, // <--- Aquí actualizamos la contraseña
      name: 'Administrador Dr.'
    },
    create: {
      email: 'jefe@tienda.com',
      password: passwordHash,
      name: 'Administrador Dr.',
      role: 'ADMIN' 
    },
  });

  console.log("✅ ¡Usuario actualizado con éxito!");
  console.log("📧 Email:", user.email);
  console.log("🔑 Contraseña:", "pass_seguro_123");
}

main()
  .catch((e) => {
    console.error("❌ Error al actualizar:");
    console.error(e);
  })
  .finally(async () => await prisma.$disconnect());