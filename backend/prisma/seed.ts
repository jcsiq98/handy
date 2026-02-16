import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Service Categories ──
  const categories = await Promise.all([
    prisma.serviceCategory.upsert({
      where: { slug: 'plumbing' },
      update: {},
      create: {
        name: 'Plomería',
        slug: 'plumbing',
        icon: '🔧',
        description: 'Reparación de tuberías, grifos, drenaje y más',
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: 'electrical' },
      update: {},
      create: {
        name: 'Electricidad',
        slug: 'electrical',
        icon: '⚡',
        description: 'Instalaciones eléctricas, apagones, cortocircuitos',
        sortOrder: 2,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: 'cleaning' },
      update: {},
      create: {
        name: 'Limpieza',
        slug: 'cleaning',
        icon: '🧹',
        description: 'Limpieza de hogar, oficina, post-construcción',
        sortOrder: 3,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: 'gardening' },
      update: {},
      create: {
        name: 'Jardinería',
        slug: 'gardening',
        icon: '🌿',
        description: 'Corte de pasto, poda, diseño de jardines',
        sortOrder: 4,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: 'painting' },
      update: {},
      create: {
        name: 'Pintura',
        slug: 'painting',
        icon: '🎨',
        description: 'Pintura interior, exterior, impermeabilización',
        sortOrder: 5,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: 'locksmith' },
      update: {},
      create: {
        name: 'Cerrajería',
        slug: 'locksmith',
        icon: '🔑',
        description: 'Apertura de puertas, cambio de chapas, duplicado de llaves',
        sortOrder: 6,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: 'repair' },
      update: {},
      create: {
        name: 'Reparaciones',
        slug: 'repair',
        icon: '🔨',
        description: 'Reparaciones generales del hogar',
        sortOrder: 7,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { slug: 'moving' },
      update: {},
      create: {
        name: 'Mudanzas',
        slug: 'moving',
        icon: '📦',
        description: 'Mudanzas locales, embalaje, transporte',
        sortOrder: 8,
      },
    }),
  ]);

  console.log(`✅ ${categories.length} service categories created`);

  // ── Provider Users + Profiles ──
  const providers = [
    {
      name: 'Carlos Mendoza',
      phone: '5215512345001',
      bio: 'Plomero profesional con 15 años de experiencia. Especialista en reparación de tuberías y drenaje.',
      serviceTypes: ['plumbing'],
      ratingAvg: 4.8,
      ratingCount: 47,
      totalJobs: 52,
      verified: true,
      lat: 19.4326,
      lng: -99.1332,
    },
    {
      name: 'Roberto Hernández',
      phone: '5215512345002',
      bio: 'Electricista certificado. Instalaciones residenciales y comerciales. 20+ años de experiencia.',
      serviceTypes: ['electrical'],
      ratingAvg: 4.9,
      ratingCount: 63,
      totalJobs: 71,
      verified: true,
      lat: 19.4284,
      lng: -99.1276,
    },
    {
      name: 'María Guadalupe López',
      phone: '5215512345003',
      bio: 'Servicio de limpieza profesional para hogares y oficinas. Equipo propio.',
      serviceTypes: ['cleaning'],
      ratingAvg: 4.7,
      ratingCount: 89,
      totalJobs: 102,
      verified: true,
      lat: 19.4195,
      lng: -99.1526,
    },
    {
      name: 'José Antonio García',
      phone: '5215512345004',
      bio: 'Jardinero con pasión por las plantas. Diseño de jardines y mantenimiento.',
      serviceTypes: ['gardening'],
      ratingAvg: 4.6,
      ratingCount: 34,
      totalJobs: 38,
      verified: false,
      lat: 19.4350,
      lng: -99.1450,
    },
    {
      name: 'Fernando Ruiz',
      phone: '5215512345005',
      bio: 'Pintor profesional. Interiores y exteriores. Impermeabilización.',
      serviceTypes: ['painting'],
      ratingAvg: 4.5,
      ratingCount: 28,
      totalJobs: 31,
      verified: true,
      lat: 19.4250,
      lng: -99.1680,
    },
    {
      name: 'Ricardo Torres',
      phone: '5215512345006',
      bio: 'Cerrajero 24/7. Apertura de puertas, autos y cajas fuertes.',
      serviceTypes: ['locksmith'],
      ratingAvg: 4.4,
      ratingCount: 22,
      totalJobs: 25,
      verified: true,
      lat: 19.4180,
      lng: -99.1410,
    },
    {
      name: 'Miguel Ángel Vásquez',
      phone: '5215512345007',
      bio: 'Todólogo del hogar. Plomería, electricidad, carpintería. ¡Yo lo arreglo!',
      serviceTypes: ['repair', 'plumbing', 'electrical'],
      ratingAvg: 4.3,
      ratingCount: 56,
      totalJobs: 64,
      verified: false,
      lat: 19.4400,
      lng: -99.1200,
    },
    {
      name: 'Luis Enrique Morales',
      phone: '5215512345008',
      bio: 'Servicio de mudanzas con camioneta propia. Embalaje profesional.',
      serviceTypes: ['moving'],
      ratingAvg: 4.7,
      ratingCount: 41,
      totalJobs: 45,
      verified: true,
      lat: 19.4100,
      lng: -99.1550,
    },
    {
      name: 'Patricia Sánchez',
      phone: '5215512345009',
      bio: 'Especialista en limpieza profunda. Post-construcción y mudanza.',
      serviceTypes: ['cleaning'],
      ratingAvg: 4.9,
      ratingCount: 73,
      totalJobs: 80,
      verified: true,
      lat: 19.4220,
      lng: -99.1380,
    },
    {
      name: 'Alejandro Díaz',
      phone: '5215512345010',
      bio: 'Electricista y plomero. Dos oficios, una sola visita.',
      serviceTypes: ['electrical', 'plumbing'],
      ratingAvg: 4.6,
      ratingCount: 37,
      totalJobs: 42,
      verified: true,
      lat: 19.4310,
      lng: -99.1600,
    },
  ];

  for (const p of providers) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: {
        name: p.name,
        role: 'PROVIDER',
        ratingAverage: p.ratingAvg,
        ratingCount: p.ratingCount,
      },
      create: {
        phone: p.phone,
        name: p.name,
        role: 'PROVIDER',
        ratingAverage: p.ratingAvg,
        ratingCount: p.ratingCount,
      },
    });

    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: p.bio,
        serviceTypes: p.serviceTypes,
        totalJobs: p.totalJobs,
        isVerified: p.verified,
        locationLat: p.lat,
        locationLng: p.lng,
        coverageRadius: 10,
      },
      create: {
        userId: user.id,
        bio: p.bio,
        serviceTypes: p.serviceTypes,
        totalJobs: p.totalJobs,
        isVerified: p.verified,
        locationLat: p.lat,
        locationLng: p.lng,
        coverageRadius: 10,
      },
    });
  }

  console.log(`✅ ${providers.length} providers created with profiles`);

  // ── Sample Customer ──
  await prisma.user.upsert({
    where: { phone: '5215500000001' },
    update: {},
    create: {
      phone: '5215500000001',
      name: 'Ana Martínez',
      role: 'CUSTOMER',
      ratingAverage: 4.9,
      ratingCount: 5,
    },
  });

  console.log('✅ Sample customer created');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
