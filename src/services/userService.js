const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { NotFoundError, DatabaseError } = require('../utils/errors');
const dbConnection = require('../config/database');

class UserService {
  async createUser(userData) {
    const { email, name, password, role = 'USER' } = userData;

    const existingUser = await dbConnection.getClient().user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await dbConnection.getClient().user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async loginUser(email, password) {
    const user = await dbConnection.getClient().user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getUserById(userId) {
    const user = await dbConnection.getClient().user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        profile: true,
        posts: {
          select: {
            id: true,
            title: true,
            published: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getAllUsers(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      dbConnection.getClient().user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      dbConnection.getClient().user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateUser(userId, updateData) {
    const { name, email } = updateData;

    if (email) {
      const existingUser = await dbConnection.getClient().user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    const user = await dbConnection.getClient().user.update({
      where: { id: userId },
      data: { name, email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateUserAvatar(userId, avatarUrl, avatarPath) {
    const existingProfile = await dbConnection.getClient().profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      const updatedProfile = await dbConnection.getClient().profile.update({
        where: { userId },
        data: { avatar: avatarUrl },
        select: {
          id: true,
          userId: true,
          bio: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return await this.getUserById(userId);
    } else {
      const newProfile = await dbConnection.getClient().profile.create({
        data: {
          userId,
          avatar: avatarUrl,
        },
        select: {
          id: true,
          userId: true,
          bio: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return await this.getUserById(userId);
    }
  }

  async deleteUser(userId) {
    const user = await dbConnection.getClient().user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await dbConnection.getClient().user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }
}

module.exports = new UserService();
