const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const userPassword = await bcrypt.hash('User123!', 12);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@interview.com',
        name: 'Admin User',
        password: adminPassword,
        role: 'ADMIN',
      },
    });

    const user1 = await prisma.user.create({
      data: {
        email: 'john.doe@interview.com',
        name: 'John Doe',
        password: userPassword,
        role: 'USER',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: 'jane.smith@interview.com',
        name: 'Jane Smith',
        password: userPassword,
        role: 'USER',
      },
    });

    await prisma.profile.create({
      data: {
        userId: admin.id,
        bio: 'System administrator with full access to all features.',
        avatar: '/uploads/avatars/admin-avatar.jpg',
      },
    });

    await prisma.profile.create({
      data: {
        userId: user1.id,
        bio: 'Software developer passionate about Node.js and modern web technologies.',
      },
    });

    await prisma.profile.create({
      data: {
        userId: user2.id,
        bio: 'Product manager focused on user experience and product strategy.',
      },
    });

    const products = [
      {
        name: 'MacBook Pro 16"',
        description: 'High-performance laptop with M2 Pro chip, perfect for developers and designers.',
        price: 2499.99,
        category: 'Electronics',
        inStock: true,
      },
      {
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone with titanium design and advanced camera system.',
        price: 999.99,
        category: 'Electronics',
        inStock: true,
      },
      {
        name: 'Clean Code',
        description: 'A handbook of agile software craftsmanship by Robert C. Martin.',
        price: 29.99,
        category: 'Books',
        inStock: true,
      },
      {
        name: 'Design Patterns',
        description: 'Elements of Reusable Object-Oriented Software by Gang of Four.',
        price: 39.99,
        category: 'Books',
        inStock: false,
      },
      {
        name: 'AirPods Pro',
        description: 'Wireless earbuds with active noise cancellation and spatial audio.',
        price: 249.99,
        category: 'Electronics',
        inStock: true,
      },
      {
        name: 'JavaScript: The Good Parts',
        description: 'Essential JavaScript concepts and best practices by Douglas Crockford.',
        price: 19.99,
        category: 'Books',
        inStock: true,
      },
      {
        name: 'Sony WH-1000XM5',
        description: 'Premium noise-canceling headphones with exceptional sound quality.',
        price: 399.99,
        category: 'Electronics',
        inStock: true,
      },
      {
        name: 'Node.js Design Patterns',
        description: 'Learn and use design patterns in Node.js applications.',
        price: 34.99,
        category: 'Books',
        inStock: true,
      },
    ];

    for (const product of products) {
      await prisma.product.create({ data: product });
    }

    const posts = [
      {
        title: 'Getting Started with Node.js',
        content: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It allows you to run JavaScript on the server-side, enabling full-stack JavaScript development.',
        published: true,
        authorId: user1.id,
      },
      {
        title: 'Understanding RESTful APIs',
        content: 'REST (Representational State Transfer) is an architectural style for designing networked applications. RESTful APIs use HTTP methods to perform CRUD operations on resources.',
        published: true,
        authorId: user1.id,
      },
      {
        title: 'Database Design Best Practices',
        content: 'Good database design is crucial for application performance and scalability. This post covers normalization, indexing, and query optimization techniques.',
        published: false,
        authorId: user2.id,
      },
      {
        title: 'Security in Modern Web Applications',
        content: 'Security should be a primary concern in web development. This article covers authentication, authorization, and common security vulnerabilities.',
        published: true,
        authorId: admin.id,
      },
    ];

    for (const post of posts) {
      await prisma.post.create({ data: post });
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Created data summary:');
    console.log(`👥 Users: 3 (1 admin, 2 regular users)`);
    console.log(`📝 Profiles: 3`);
    console.log(`📦 Products: 8`);
    console.log(`📄 Posts: 4`);
    console.log('\n🔑 Login credentials:');
    console.log('Admin: admin@interview.com / Admin123!');
    console.log('User 1: john.doe@interview.com / User123!');
    console.log('User 2: jane.smith@interview.com / User123!');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
