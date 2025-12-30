const productService = require('../../src/services/productService');
const { NotFoundError } = require('../../src/utils/errors');

describe('ProductService', () => {
  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product description',
        price: 29.99,
        category: 'Electronics',
        inStock: true,
      };

      const product = await productService.createProduct(productData);

      expect(product).toBeDefined();
      expect(product.name).toBe(productData.name);
      expect(product.description).toBe(productData.description);
      expect(product.price).toBe(productData.price);
      expect(product.category).toBe(productData.category);
      expect(product.inStock).toBe(productData.inStock);
      expect(product.id).toBeDefined();
      expect(product.createdAt).toBeDefined();
    });

    it('should create product with default values', async () => {
      const productData = {
        name: 'Test Product',
        price: 19.99,
        category: 'Books',
      };

      const product = await productService.createProduct(productData);

      expect(product.inStock).toBe(true);
      expect(product.description).toBeNull();
    });
  });

  describe('getProductById', () => {
    let product;

    beforeEach(async () => {
      product = await productService.createProduct({
        name: 'Test Product',
        price: 29.99,
        category: 'Electronics',
      });
    });

    it('should get product by ID successfully', async () => {
      const foundProduct = await productService.getProductById(product.id);

      expect(foundProduct).toBeDefined();
      expect(foundProduct.id).toBe(product.id);
      expect(foundProduct.name).toBe(product.name);
    });

    it('should throw NotFoundError if product does not exist', async () => {
      await expect(productService.getProductById('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getAllProducts', () => {
    beforeEach(async () => {
      await productService.createProduct({
        name: 'Product 1',
        price: 10.99,
        category: 'Books',
      });
      await productService.createProduct({
        name: 'Product 2',
        price: 20.99,
        category: 'Electronics',
      });
      await productService.createProduct({
        name: 'Product 3',
        price: 30.99,
        category: 'Books',
      });
    });

    it('should get all products with pagination', async () => {
      const result = await productService.getAllProducts(1, 10);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(3);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.pages).toBe(1);
    });

    it('should respect pagination parameters', async () => {
      const result = await productService.getAllProducts(1, 2);

      expect(result.products).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.pages).toBe(2);
    });

    it('should filter products by category', async () => {
      const result = await productService.getAllProducts(1, 10, 'Books');

      expect(result.products).toHaveLength(2);
      expect(result.products.every(p => p.category === 'Books')).toBe(true);
    });
  });

  describe('updateProduct', () => {
    let product;

    beforeEach(async () => {
      product = await productService.createProduct({
        name: 'Test Product',
        price: 29.99,
        category: 'Electronics',
      });
    });

    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 39.99,
        inStock: false,
      };

      const updatedProduct = await productService.updateProduct(product.id, updateData);

      expect(updatedProduct.name).toBe(updateData.name);
      expect(updatedProduct.price).toBe(updateData.price);
      expect(updatedProduct.inStock).toBe(updateData.inStock);
      expect(updatedProduct.updatedAt).toBeDefined();
    });

    it('should throw NotFoundError if product does not exist', async () => {
      await expect(productService.updateProduct('non-existent-id', { name: 'New Name' }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deleteProduct', () => {
    let product;

    beforeEach(async () => {
      product = await productService.createProduct({
        name: 'Test Product',
        price: 29.99,
        category: 'Electronics',
      });
    });

    it('should delete product successfully', async () => {
      const result = await productService.deleteProduct(product.id);

      expect(result.message).toBe('Product deleted successfully');

      const deletedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(deletedProduct).toBeNull();
    });

    it('should throw NotFoundError if product does not exist', async () => {
      await expect(productService.deleteProduct('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getProductsByCategory', () => {
    beforeEach(async () => {
      await productService.createProduct({
        name: 'Book 1',
        price: 10.99,
        category: 'Books',
      });
      await productService.createProduct({
        name: 'Book 2',
        price: 15.99,
        category: 'Books',
      });
      await productService.createProduct({
        name: 'Gadget 1',
        price: 29.99,
        category: 'Electronics',
      });
    });

    it('should get products by category with pagination', async () => {
      const result = await productService.getProductsByCategory('Books', 1, 10);

      expect(result.products).toHaveLength(2);
      expect(result.products.every(p => p.category === 'Books')).toBe(true);
      expect(result.pagination.total).toBe(2);
    });

    it('should return empty result for non-existent category', async () => {
      const result = await productService.getProductsByCategory('NonExistent', 1, 10);

      expect(result.products).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('searchProducts', () => {
    beforeEach(async () => {
      await productService.createProduct({
        name: 'iPhone 13',
        description: 'Latest Apple smartphone',
        price: 999.99,
        category: 'Electronics',
      });
      await productService.createProduct({
        name: 'Samsung Galaxy',
        description: 'Android smartphone',
        price: 799.99,
        category: 'Electronics',
      });
      await productService.createProduct({
        name: 'JavaScript Guide',
        description: 'Programming book',
        price: 29.99,
        category: 'Books',
      });
    });

    it('should search products by name', async () => {
      const result = await productService.searchProducts('iPhone', 1, 10);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toContain('iPhone');
    });

    it('should search products by description', async () => {
      const result = await productService.searchProducts('smartphone', 1, 10);

      expect(result.products).toHaveLength(2);
    });

    it('should search products by category', async () => {
      const result = await productService.searchProducts('Electronics', 1, 10);

      expect(result.products).toHaveLength(2);
    });

    it('should return empty result for non-matching query', async () => {
      const result = await productService.searchProducts('NonExistent', 1, 10);

      expect(result.products).toHaveLength(0);
    });

    it('should be case insensitive', async () => {
      const result1 = await productService.searchProducts('iphone', 1, 10);
      const result2 = await productService.searchProducts('IPHONE', 1, 10);

      expect(result1.products).toHaveLength(1);
      expect(result2.products).toHaveLength(1);
      expect(result1.products[0].id).toBe(result2.products[0].id);
    });
  });
});
