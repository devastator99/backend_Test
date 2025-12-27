const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProductService {
  async createProduct(productData) {
    const { name, description, price, category, inStock = true } = productData;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        category,
        inStock,
      },
    });

    return product;
  }

  async getProductById(productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  async getAllProducts(page = 1, limit = 10, category = null) {
    const skip = (page - 1) * limit;
    const where = category ? { category } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateProduct(productId, updateData) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return updatedProduct;
  }

  async deleteProduct(productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Product deleted successfully' };
  }

  async getProductsByCategory(category, page = 1, limit = 10) {
    return this.getAllProducts(page, limit, category);
  }

  async searchProducts(query, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
          ],
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new ProductService();
