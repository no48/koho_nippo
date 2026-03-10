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

  // 従業員（12名）
  const employees = await Promise.all([
    prisma.employee.create({
      data: { name: "山田 太郎", nameKana: "ヤマダ タロウ", phone: "090-1234-5678", memo: "ベテランドライバー" },
    }),
    prisma.employee.create({
      data: { name: "佐藤 次郎", nameKana: "サトウ ジロウ", phone: "090-2345-6789", memo: "大型免許所持" },
    }),
    prisma.employee.create({
      data: { name: "鈴木 三郎", nameKana: "スズキ サブロウ", phone: "090-3456-7890", memo: "" },
    }),
    prisma.employee.create({
      data: { name: "高橋 健一", nameKana: "タカハシ ケンイチ", phone: "090-4567-8901", memo: "長距離担当" },
    }),
    prisma.employee.create({
      data: { name: "田中 誠", nameKana: "タナカ マコト", phone: "090-5678-9012", memo: "" },
    }),
    prisma.employee.create({
      data: { name: "渡辺 浩二", nameKana: "ワタナベ コウジ", phone: "090-6789-0123", memo: "リーダー" },
    }),
    prisma.employee.create({
      data: { name: "伊藤 大輔", nameKana: "イトウ ダイスケ", phone: "090-7890-1234", memo: "" },
    }),
    prisma.employee.create({
      data: { name: "中村 翔太", nameKana: "ナカムラ ショウタ", phone: "090-8901-2345", memo: "新人" },
    }),
    prisma.employee.create({
      data: { name: "小林 和也", nameKana: "コバヤシ カズヤ", phone: "090-9012-3456", memo: "" },
    }),
    prisma.employee.create({
      data: { name: "加藤 正人", nameKana: "カトウ マサト", phone: "090-0123-4567", memo: "大型免許所持" },
    }),
    prisma.employee.create({
      data: { name: "吉田 隆", nameKana: "ヨシダ タカシ", phone: "080-1234-5678", memo: "" },
    }),
    prisma.employee.create({
      data: { name: "山本 慎吾", nameKana: "ヤマモト シンゴ", phone: "080-2345-6789", memo: "副リーダー" },
    }),
  ]);
  console.log(`Created ${employees.length} employees`);

  // トラック（10台）
  const trucks = await Promise.all([
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 1234", vehicleName: "いすゞ エルフ 2t", memo: "小型" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 2345", vehicleName: "日野 デュトロ 2t", memo: "小型" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 3456", vehicleName: "三菱ふそう キャンター 3t", memo: "中型" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 4567", vehicleName: "いすゞ フォワード 4t", memo: "中型" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 5678", vehicleName: "日野 レンジャー 4t", memo: "中型・冷凍車" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 6789", vehicleName: "いすゞ ギガ 10t", memo: "大型" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 7890", vehicleName: "日野 プロフィア 10t", memo: "大型" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 8901", vehicleName: "三菱ふそう スーパーグレート 10t", memo: "大型・ウイング車" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 9012", vehicleName: "UDトラックス クオン 10t", memo: "大型" },
    }),
    prisma.truck.create({
      data: { vehicleNumber: "埼玉 100 あ 0123", vehicleName: "日野 デュトロ 1.5t", memo: "小型・パワーゲート付" },
    }),
  ]);
  console.log(`Created ${trucks.length} trucks`);

  // 得意先（10社）
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "平田倉庫株式会社",
        address: "埼玉県杉戸町杉戸1-1-1",
        phone: "048-123-4567",
        contactPerson: "物流部 鈴木",
        memo: "主要取引先",
      },
    }),
    prisma.customer.create({
      data: {
        name: "王子コンテナー株式会社",
        address: "茨城県常総市坂手町5000",
        phone: "0297-123-4567",
        contactPerson: "配送課 田中",
        memo: "つくば工場・高崎工場",
      },
    }),
    prisma.customer.create({
      data: {
        name: "埼玉建材工業",
        address: "埼玉県川口市芝中田3-3-3",
        phone: "048-234-5678",
        contactPerson: "総務部 佐藤",
        memo: "建材配送",
      },
    }),
    prisma.customer.create({
      data: {
        name: "株式会社 大宮商事",
        address: "埼玉県さいたま市大宮区宮町4-4-4",
        phone: "048-345-6789",
        contactPerson: "営業部 高橋",
        memo: "",
      },
    }),
    prisma.customer.create({
      data: {
        name: "群馬精密機器株式会社",
        address: "群馬県前橋市大手町5-5-5",
        phone: "027-123-4567",
        contactPerson: "出荷担当 山田",
        memo: "精密機器・取扱注意",
      },
    }),
    prisma.customer.create({
      data: {
        name: "千葉港運送",
        address: "千葉県千葉市中央区港町6-6-6",
        phone: "043-123-4567",
        contactPerson: "配車担当 中村",
        memo: "港湾配送",
      },
    }),
    prisma.customer.create({
      data: {
        name: "北関東倉庫株式会社",
        address: "栃木県宇都宮市駅前通り7-7-7",
        phone: "028-123-4567",
        contactPerson: "倉庫管理 小林",
        memo: "",
      },
    }),
    prisma.customer.create({
      data: {
        name: "横浜港湾サービス",
        address: "神奈川県横浜市中区本町8-8-8",
        phone: "045-123-4567",
        contactPerson: "荷役担当 加藤",
        memo: "コンテナ配送",
      },
    }),
    prisma.customer.create({
      data: {
        name: "茨城農産物流通センター",
        address: "茨城県つくば市研究学園9-9-9",
        phone: "029-123-4567",
        contactPerson: "出荷担当 吉田",
        memo: "農産物配送",
      },
    }),
    prisma.customer.create({
      data: {
        name: "新潟運輸株式会社",
        address: "新潟県新潟市中央区万代10-10-10",
        phone: "025-123-4567",
        contactPerson: "配送部 渡辺",
        memo: "長距離定期便",
      },
    }),
  ]);
  console.log(`Created ${customers.length} customers`);

  // 品名リスト（コンテナ系）
  const productNames = [
    "OND-EM/OND-EM/OND-EM",
    "OND-EM/OND-EM/OFC-EM",
    "OFC-EM/OFC-EM/OFC-EM/OFLM-EM",
    "段ボール原紙",
    "工業製品",
    "食品原料",
    "建材",
    "精密機器",
  ];

  // 発地リスト
  const origins = [
    { name: "埼玉県杉戸町", detail: "平田倉庫㈱ 杉戸倉庫" },
    { name: "東京都江東区", detail: "豊洲物流センター" },
    { name: "埼玉県川口市", detail: "川口配送センター" },
    { name: "群馬県前橋市", detail: "前橋工場" },
    { name: "千葉県千葉市", detail: "千葉港ターミナル" },
  ];

  // 着地リスト
  const destinations = [
    { name: "茨城県常総市", detail: "王子コンテナー㈱つくば工場" },
    { name: "群馬県佐波郡玉村町", detail: "王子コンテナー㈱高崎" },
    { name: "神奈川県川崎市", detail: "川崎物流センター" },
    { name: "埼玉県所沢市", detail: "所沢配送センター" },
    { name: "千葉県船橋市", detail: "船橋倉庫" },
  ];

  const fares = [15000, 18000, 22000, 25000, 28000, 32000, 35000, 40000, 45000, 50000];
  const tollFees = [0, 0, 0, 1500, 2200, 3000, 3500, 4500];

  const reports: {
    reportNumber: string;
    reportDate: Date;
    employeeId: number;
    truckId: number;
    customerId: number;
    origin: string;
    destination: string;
    productName: string;
    quantity: number;
    tonnage: number;
    fare: number;
    tollFee: number;
    itemMemo: string | null;
    memo: string | null;
  }[] = [];
  const today = new Date();

  // 過去60日分のデータを生成
  for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    // 土日はスキップ（または少なめに）
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) continue; // 日曜は休み

    // 1日あたり1-4件の日報
    const reportsPerDay = dayOfWeek === 6 ? 1 : Math.floor(Math.random() * 4) + 1;

    for (let i = 0; i < reportsPerDay; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const truck = trucks[Math.floor(Math.random() * trucks.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const originData = origins[Math.floor(Math.random() * origins.length)];
      const destData = destinations[Math.floor(Math.random() * destinations.length)];
      const fare = fares[Math.floor(Math.random() * fares.length)];
      const tollFee = tollFees[Math.floor(Math.random() * tollFees.length)];
      const productName = productNames[Math.floor(Math.random() * productNames.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const tonnage = (Math.floor(Math.random() * 100) + 10) / 10; // 1.0 - 11.0

      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
      const existingCount = reports.filter((r) => r.reportNumber.startsWith(dateStr)).length;
      const reportNumber = `${dateStr}-${String(existingCount + 1).padStart(3, "0")}`;

      reports.push({
        reportNumber,
        reportDate: new Date(date.toISOString().split("T")[0]),
        employeeId: employee.id,
        truckId: truck.id,
        customerId: customer.id,
        origin: `${originData.name} ${originData.detail}`,
        destination: `${destData.name} ${destData.detail}`,
        productName,
        quantity,
        tonnage,
        fare,
        tollFee,
        itemMemo: Math.random() > 0.9 ? "翌日納品" : null,
        memo: Math.random() > 0.9 ? "特記事項あり" : null,
      });
    }
  }

  // 日報をデータベースに挿入
  for (const report of reports) {
    await prisma.dailyReport.create({ data: report });
  }
  console.log(`Created ${reports.length} daily reports`);

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
