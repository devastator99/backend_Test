const userService = require('../../src/services/userService');
const { ConflictError, NotFoundError, UnauthorizedError } = require('../../src/utils/errors');
const bcrypt = require('bcryptjs');

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
        role: 'USER',
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe(userData.role);
      expect(user.password).toBeUndefined();
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    it('should throw ConflictError if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      };

      await userService.createUser(userData);

      await expect(userService.createUser(userData))
        .rejects
        .toThrow(ConflictError);
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      };

      await userService.createUser(userData);

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(user.password).not.toBe(userData.password);
      expect(bcrypt.compareSync(userData.password, user.password)).toBe(true);
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      });
    });

    it('should login user with valid credentials', async () => {
      const result = await userService.loginUser('test@example.com', 'Password123!');

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBeUndefined();
    });

    it('should throw UnauthorizedError with invalid email', async () => {
      await expect(userService.loginUser('wrong@example.com', 'Password123!'))
        .rejects
        .toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError with invalid password', async () => {
      await expect(userService.loginUser('test@example.com', 'wrongpassword'))
        .rejects
        .toThrow(UnauthorizedError);
    });
  });

  describe('getUserById', () => {
    let user;

    beforeEach(async () => {
      user = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      });
    });

    it('should get user by ID successfully', async () => {
      const foundUser = await userService.getUserById(user.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(user.id);
      expect(foundUser.email).toBe(user.email);
      expect(foundUser.password).toBeUndefined();
    });

    it('should throw NotFoundError if user does not exist', async () => {
      await expect(userService.getUserById('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await userService.createUser({
        email: 'user1@example.com',
        name: 'User One',
        password: 'Password123!',
      });
      await userService.createUser({
        email: 'user2@example.com',
        name: 'User Two',
        password: 'Password123!',
      });
    });

    it('should get all users with pagination', async () => {
      const result = await userService.getAllUsers(1, 10);

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
    });

    it('should respect pagination parameters', async () => {
      const result = await userService.getAllUsers(1, 1);

      expect(result.users).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.pages).toBe(2);
    });
  });

  describe('updateUser', () => {
    let user;

    beforeEach(async () => {
      user = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      });
    });

    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const updatedUser = await userService.updateUser(user.id, updateData);

      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.email).toBe(updateData.email);
      expect(updatedUser.updatedAt).toBeDefined();
    });

    it('should throw NotFoundError if user does not exist', async () => {
      await expect(userService.updateUser('non-existent-id', { name: 'New Name' }))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw ConflictError if email already exists', async () => {
      await userService.createUser({
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'Password123!',
      });

      await expect(userService.updateUser(user.id, { email: 'existing@example.com' }))
        .rejects
        .toThrow(ConflictError);
    });
  });

  describe('deleteUser', () => {
    let user;

    beforeEach(async () => {
      user = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123!',
      });
    });

    it('should delete user successfully', async () => {
      const result = await userService.deleteUser(user.id);

      expect(result.message).toBe('User deleted successfully');

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should throw NotFoundError if user does not exist', async () => {
      await expect(userService.deleteUser('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});
