const request = require('supertest');
const app = require('../../src/index');

const createTestUser = async (userData = {}) => {
  const defaultUserData = {
    email: 'test@example.com',
    name: 'Test User',
    password: 'Password123!',
    role: 'USER',
    ...userData,
  };

  const response = await request(app)
    .post('/api/users/register')
    .send(defaultUserData);

  return response.body.data;
};

const loginTestUser = async (email, password) => {
  const response = await request(app)
    .post('/api/users/login')
    .send({ email, password });

  return response.body.data.token;
};

const createTestProduct = async (productData = {}, token) => {
  const defaultProductData = {
    name: 'Test Product',
    description: 'A test product',
    price: 29.99,
    category: 'Electronics',
    inStock: true,
    ...productData,
  };

  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send(defaultProductData);

  return response.body.data;
};

const createAuthenticatedUser = async (role = 'USER') => {
  const user = await createTestUser({ role });
  const token = await loginTestUser(user.email, 'Password123!');
  return { user, token };
};

const createAdminUser = async () => {
  return createAuthenticatedUser('ADMIN');
};

const createRegularUser = async () => {
  return createAuthenticatedUser('USER');
};

const expectSuccessResponse = (response, expectedData = null) => {
  expect(response.body.success).toBe(true);
  expect(response.body.timestamp).toBeDefined();
  
  if (expectedData) {
    if (typeof expectedData === 'object') {
      expect(response.body.data).toMatchObject(expectedData);
    } else {
      expect(response.body.data).toBe(expectedData);
    }
  }
};

const expectErrorResponse = (response, expectedStatus, expectedMessage = null) => {
  expect(response.body.success).toBe(false);
  expect(response.status).toBe(expectedStatus);
  expect(response.body.timestamp).toBeDefined();
  
  if (expectedMessage) {
    expect(response.body.message).toContain(expectedMessage);
  }
};

const expectValidationErrorResponse = (response, expectedFields = null) => {
  expectErrorResponse(response, 400, 'Validation failed');
  expect(response.body.errors).toBeDefined();
  expect(Array.isArray(response.body.errors)).toBe(true);
  
  if (expectedFields) {
    const errorFields = response.body.errors.map(err => err.field);
    expectedFields.forEach(field => {
      expect(errorFields).toContain(field);
    });
  }
};

const expectPaginatedResponse = (response, expectedItemCount = null) => {
  expectSuccessResponse(response);
  expect(response.body.data.products).toBeDefined();
  expect(response.body.data.pagination).toBeDefined();
  expect(response.body.data.pagination.page).toBeDefined();
  expect(response.body.data.pagination.limit).toBeDefined();
  expect(response.body.data.pagination.total).toBeDefined();
  expect(response.body.data.pagination.pages).toBeDefined();
  
  if (expectedItemCount !== null) {
    expect(response.body.data.products).toHaveLength(expectedItemCount);
  }
};

const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateRandomEmail = () => {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${randomString}@test.com`;
};

const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const cleanDatabase = async () => {
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.post.deleteMany();
};

const setupTestData = async () => {
  await cleanDatabase();
  
  const admin = await createAdminUser();
  const user = await createRegularUser();
  
  const product1 = await createTestProduct({
    name: 'Test Product 1',
    price: 19.99,
    category: 'Books',
  }, admin.token);
  
  const product2 = await createTestProduct({
    name: 'Test Product 2',
    price: 29.99,
    category: 'Electronics',
  }, admin.token);
  
  return {
    admin,
    user,
    products: [product1, product2],
  };
};

module.exports = {
  createTestUser,
  loginTestUser,
  createTestProduct,
  createAuthenticatedUser,
  createAdminUser,
  createRegularUser,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationErrorResponse,
  expectPaginatedResponse,
  waitFor,
  generateRandomEmail,
  generateRandomString,
  cleanDatabase,
  setupTestData,
};
