import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 会社設定
  const companySettings = [
    { key: "companyName", value: "株式会社 高邦運輸" },
    { key: "companyZipcode", value: "367-0036" },
    { key: "companyAddress", value: "埼玉県本庄市今井548番地4" },
    { key: "companyPhone", value: "0495-21-5348" },
    { key: "companyFax", value: "0495-21-9723" },
    { key: "invoiceRegistrationNumber", value: "T-8030001060231" },
    { key: "bankName", value: "群馬銀行" },
    { key: "bankBranch", value: "本庄支店" },
    { key: "bankAccountType", value: "普通" },
    { key: "bankAccountNumber", value: "0603118" },
  ];

  for (const setting of companySettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`Created ${companySettings.length} company settings`);

  // 管理者ユーザー作成
  const hashedPassword = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "管理者",
      password: hashedPassword,
    },
  });
  console.log("Created admin user: admin@example.com / password123");

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
