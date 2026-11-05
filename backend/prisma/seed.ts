import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --- Users ---
  const ownerHash = await bcrypt.hash('owner123', 10);
  const marketHash = await bcrypt.hash('market123', 10);

  const owner = await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      passwordHash: ownerHash,
      name: 'Rajesh Kumar (Owner)',
      role: 'OWNER',
    },
  });

  const market = await prisma.user.upsert({
    where: { username: 'market' },
    update: {},
    create: {
      username: 'market',
      passwordHash: marketHash,
      name: 'Suresh (Market Entry)',
      role: 'MARKET_ENTRY',
    },
  });

  console.log(`✅ Users created: ${owner.name}, ${market.name}`);

  // --- Vegetables ---
  const vegetables = [
    { nameEn: 'Potato', nameHi: 'आलू', unit: 'kg', category: 'Root' },
    { nameEn: 'Onion', nameHi: 'प्याज़', unit: 'kg', category: 'Root' },
    { nameEn: 'Tomato', nameHi: 'टमाटर', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Cauliflower', nameHi: 'फूलगोभी', unit: 'piece', category: 'Fruit' },
    { nameEn: 'Cabbage', nameHi: 'पत्तागोभी', unit: 'piece', category: 'Leafy' },
    { nameEn: 'Peas', nameHi: 'मटर', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Carrot', nameHi: 'गाजर', unit: 'kg', category: 'Root' },
    { nameEn: 'Radish', nameHi: 'मूली', unit: 'bunch', category: 'Root' },
    { nameEn: 'Spinach', nameHi: 'पालक', unit: 'bunch', category: 'Leafy' },
    { nameEn: 'Fenugreek', nameHi: 'मेथी', unit: 'bunch', category: 'Leafy' },
    { nameEn: 'Coriander', nameHi: 'धनिया', unit: 'bunch', category: 'Herbs' },
    { nameEn: 'Green Chilli', nameHi: 'हरी मिर्च', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Ginger', nameHi: 'अदरक', unit: 'kg', category: 'Root' },
    { nameEn: 'Garlic', nameHi: 'लहसुन', unit: 'kg', category: 'Root' },
    { nameEn: 'Brinjal', nameHi: 'बैंगन', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Okra', nameHi: 'भिंडी', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Bottle Gourd', nameHi: 'लौकी', unit: 'piece', category: 'Fruit' },
    { nameEn: 'Ridge Gourd', nameHi: 'तोरई', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Bitter Gourd', nameHi: 'करेला', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Pumpkin', nameHi: 'कद्दू', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Cucumber', nameHi: 'खीरा', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Capsicum', nameHi: 'शिमला मिर्च', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Beans', nameHi: 'सेम/बीन्स', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Drumstick', nameHi: 'सहजन', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Lemon', nameHi: 'नींबू', unit: 'kg', category: 'Fruit' },
    { nameEn: 'Sweet Potato', nameHi: 'शकरकंद', unit: 'kg', category: 'Root' },
    { nameEn: 'Turnip', nameHi: 'शलगम', unit: 'kg', category: 'Root' },
    { nameEn: 'Beetroot', nameHi: 'चुकंदर', unit: 'kg', category: 'Root' },
    { nameEn: 'Mushroom', nameHi: 'मशरूम', unit: 'kg', category: 'Others' },
    { nameEn: 'Mint', nameHi: 'पुदीना', unit: 'bunch', category: 'Herbs' },
  ];

  for (const veg of vegetables) {
    await prisma.vegetable.upsert({
      where: { id: vegetables.indexOf(veg) + 1 },
      update: {},
      create: veg,
    });
  }
  console.log(`✅ ${vegetables.length} vegetables created`);

  // --- Sellers ---
  const sellers = [
    {
      name: 'Ramesh Yadav',
      phone: '9876543210',
      village: 'Barauli',
      type: 'Farmer',
      isOwnFarmer: true,
      openingBalance: 500000, // ₹5,000 in paise
    },
    {
      name: 'Shyam Lal',
      phone: '9876543211',
      village: 'Chandpur',
      type: 'Farmer',
      isOwnFarmer: false,
      openingBalance: 250000, // ₹2,500 in paise
    },
    {
      name: 'Mandi Wholesaler Raju',
      phone: '9876543212',
      village: 'Azadpur Mandi',
      type: 'Mandi Trader',
      isOwnFarmer: false,
      openingBalance: 1000000, // ₹10,000 in paise
    },
  ];

  for (const seller of sellers) {
    await prisma.seller.upsert({
      where: { id: sellers.indexOf(seller) + 1 },
      update: {},
      create: seller,
    });
  }
  console.log(`✅ ${sellers.length} sellers created`);

  // --- Buyers ---
  const buyers = [
    {
      name: 'Hotel Sagar',
      contactPerson: 'Vikas Sharma',
      phone: '9988776655',
      address: 'Main Road, Lucknow',
      openingBalance: 300000, // ₹3,000 in paise (they owe us)
    },
    {
      name: 'Krishna Vegetables (Retail)',
      contactPerson: 'Krishna Gupta',
      phone: '9988776656',
      address: 'Sector 21 Market',
      openingBalance: 0,
    },
    {
      name: 'Annapurna Dhaba',
      contactPerson: 'Munna Bhai',
      phone: '9988776657',
      address: 'Highway NH-28',
      openingBalance: 150000, // ₹1,500 in paise
    },
  ];

  for (const buyer of buyers) {
    await prisma.buyer.upsert({
      where: { id: buyers.indexOf(buyer) + 1 },
      update: {},
      create: buyer,
    });
  }
  console.log(`✅ ${buyers.length} buyers created`);

  // --- Initial Accounts (Cash in Hand & SBI Bank) ---
  const accounts = [
    {
      id: 1,
      name: 'Cash in Hand (गल्ला)',
      type: 'CASH',
      openingBalance: 1500000, // ₹15,000 in paise
      isDefault: true,
    },
    {
      id: 2,
      name: 'SBI Current Account',
      type: 'BANK',
      accountNumber: 'XXXXXX4821',
      openingBalance: 6500000, // ₹65,000 in paise
      isDefault: false,
    },
    {
      id: 3,
      name: 'UPI QR (PhonePe / GPay)',
      type: 'UPI',
      openingBalance: 500000, // ₹5,000 in paise
      isDefault: false,
    },
  ];

  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { id: acc.id },
      update: {},
      create: acc,
    });
  }
  console.log(`✅ ${accounts.length} accounts created`);

  // --- App Settings (PIN starts empty so owner can set it) ---
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ownerPin: null },
  });
  console.log('✅ App settings initialized');

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
