const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const app = require('../src/index');

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.post.deleteMany();
});

global.request = request(app);
global.prisma = prisma;
