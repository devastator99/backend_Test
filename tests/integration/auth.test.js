const jwt = require('jsonwebtoken');

describe('Authentication Integration Tests', () => {
  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      };

      const response = await request
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return validation error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'Password123!',
      };

      const response = await request
        .post('/api/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    it('should return validation error for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'weak',
      };

      const response = await request
        .post('/api/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return conflict error for existing user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      };

      await request
        .post('/api/users/register')
        .send(userData);

      const response = await request
        .post('/api/users/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      await request
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: 'Password123!',
        });
    });

    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request
        .post('/api/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user.password).toBeUndefined();

      const decoded = jwt.verify(response.body.data.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBeDefined();
    });

    it('should return unauthorized error for invalid email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'Password123!',
      };

      const response = await request
        .post('/api/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return unauthorized error for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request
        .post('/api/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return validation error for missing fields', async () => {
      const response = await request
        .post('/api/users/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/users/profile', () => {
    let token;
    let user;

    beforeEach(async () => {
      const registerResponse = await request
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: 'Password123!',
        });

      user = registerResponse.body.data;

      const loginResponse = await request
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      token = loginResponse.body.data.token;
    });

    it('should get user profile successfully', async () => {
      const response = await request
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data.name).toBe(user.name);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return unauthorized error without token', async () => {
      const response = await request
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    it('should return unauthorized error with invalid token', async () => {
      const response = await request
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should return unauthorized error with malformed token', async () => {
      const response = await request
        .get('/api/users/profile')
        .set('Authorization', 'invalid-format')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
  });
});
