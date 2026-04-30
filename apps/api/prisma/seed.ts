import { PrismaClient } from '@prisma/client';
import { SYSTEM_CATEGORIES } from '@finanzapp/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding system categories...');
  for (const cat of SYSTEM_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, icon: cat.icon, color: cat.color, isIncome: cat.isIncome },
      create: {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isIncome: cat.isIncome,
        isSystem: true,
        sortOrder: SYSTEM_CATEGORIES.indexOf(cat),
      },
    });
    if (cat.children) {
      for (const child of cat.children) {
        await prisma.category.upsert({
          where: { id: child.id },
          update: { name: child.name, icon: child.icon, color: child.color },
          create: {
            id: child.id,
            name: child.name,
            icon: child.icon,
            color: child.color,
            isIncome: child.isIncome,
            isSystem: true,
            parentId: cat.id,
            sortOrder: cat.children!.indexOf(child),
          },
        });
      }
    }
  }
  console.log('Seeding complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
