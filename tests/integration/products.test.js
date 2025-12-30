describe('Products Integration Tests', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;

  beforeEach(async () => {
    const adminResponse = await request
      .post('/api/users/register')
      .send({
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'Password123!',
        role: 'ADMIN',
      });

    const adminLoginResponse = await request
      .post('/api/users/login')
      .send({
        email: 'admin@example.com',
        password: 'Password123!',
      });

    adminToken = adminLoginResponse.body.data.token;
    adminUser = adminResponse.body.data;

    const userResponse = await request
      .post('/api/users/register')
      .send({
        email: 'user@example.com',
        name: 'Regular User',
        password: 'Password123!',
      });

    const userLoginResponse = await request
      .post('/api/users/login')
      .send({
        email: 'user@example.com',
        password: 'Password123!',
      });

    userToken = userLoginResponse.body.data.token;
    regularUser = userResponse.body.data;
  });

  describe('POST /api/products', () => {
    const productData = {
      name: 'Test Product',
      description: 'A test product description',
      price: 29.99,
      category: 'Electronics',
      inStock: true,
    };

    it('should create product as admin', async () => {
      const response = await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product created successfully');
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.price).toBe(productData.price);
    });

    it('should return forbidden error for regular user', async () => {
      const response = await request
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(productData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    it('should return unauthorized error without token', async () => {
      const response = await request
        .post('/api/products')
        .send(productData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        name: 'A',
        price: -10,
        category: '',
      };

      const response = await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product 1',
          price: 10.99,
          category: 'Books',
        });

      await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product 2',
          price: 20.99,
          category: 'Electronics',
        });
    });

    it('should get all products without authentication', async () => {
      const response = await request
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should respect pagination parameters', async () => {
      const response = await request
        .get('/api/products?page=1&limit=1')
        .expect(200);

      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('should filter by category', async () => {
      const response = await request
        .get('/api/products?category=Books')
        .expect(200);

      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].category).toBe('Books');
    });
  });

  describe('GET /api/products/:id', () => {
    let product;

    beforeEach(async () => {
      const response = await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          price: 29.99,
          category: 'Electronics',
        });

      product = response.body.data;
    });

    it('should get product by ID', async () => {
      const response = await request
        .get(`/api/products/${product.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(product.id);
      expect(response.body.data.name).toBe(product.name);
    });

    it('should return not found for non-existent product', async () => {
      const response = await request
        .get('/api/products/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('PUT /api/products/:id', () => {
    let product;

    beforeEach(async () => {
      const response = await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          price: 29.99,
          category: 'Electronics',
        });

      product = response.body.data;
    });

    it('should update product as admin', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 39.99,
        inStock: false,
      };

      const response = await request
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price).toBe(updateData.price);
      expect(response.body.data.inStock).toBe(updateData.inStock);
    });

    it('should return forbidden error for regular user', async () => {
      const response = await request
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return not found for non-existent product', async () => {
      const response = await request
        .put('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let product;

    beforeEach(async () => {
      const response = await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          price: 29.99,
          category: 'Electronics',
        });

      product = response.body.data;
    });

    it('should delete product as admin', async () => {
      const response = await request
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Product deleted successfully');
    });

    it('should return forbidden error for regular user', async () => {
      const response = await request
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return not found for non-existent product', async () => {
      const response = await request
        .delete('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/category/:category', () => {
    beforeEach(async () => {
      await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Book 1',
          price: 10.99,
          category: 'Books',
        });

      await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Gadget 1',
          price: 29.99,
          category: 'Electronics',
        });
    });

    it('should get products by category', async () => {
      const response = await request
        .get('/api/products/category/Books')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].category).toBe('Books');
    });

    it('should return empty for non-existent category', async () => {
      const response = await request
        .get('/api/products/category/NonExistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(0);
    });
  });

  describe('GET /api/products/search', () => {
    beforeEach(async () => {
      await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'iPhone 13',
          description: 'Latest Apple smartphone',
          price: 999.99,
          category: 'Electronics',
        });

      await request
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Samsung Galaxy',
          description: 'Android smartphone',
          price: 799.99,
          category: 'Electronics',
        });
    });

    it('should search products by query', async () => {
      const response = await request
        .get('/api/products/search?q=iPhone')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].name).toContain('iPhone');
    });

    it('should return validation error for empty query', async () => {
      const response = await request
        .get('/api/products/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Search query is required');
    });

    it('should return empty for non-matching query', async () => {
      const response = await request
        .get('/api/products/search?q=NonExistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(0);
    });
  });
});
