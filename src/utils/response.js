class ApiResponse {
  static success(data, message = 'Success', statusCode = 200, meta = null) {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    if (meta) {
      response.meta = meta;
    }

    return response;
  }

  static created(data, message = 'Resource created successfully') {
    return this.success(data, message, 201);
  }

  static paginated(data, pagination, message = 'Data retrieved successfully') {
    return this.success(data, message, 200, { pagination });
  }

  static error(message, statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      response.errors = errors;
    }

    return response;
  }

  static validation(errors, message = 'Validation failed') {
    return this.error(message, 400, errors);
  }

  static notFound(resource = 'Resource') {
    return this.error(`${resource} not found`, 404);
  }

  static unauthorized(message = 'Unauthorized access') {
    return this.error(message, 401);
  }

  static forbidden(message = 'Forbidden access') {
    return this.error(message, 403);
  }

  static conflict(message = 'Resource already exists') {
    return this.error(message, 409);
  }

  static tooManyRequests(message = 'Too many requests', retryAfter = null) {
    const response = this.error(message, 429);
    if (retryAfter) {
      response.retryAfter = retryAfter;
    }
    return response;
  }
}

class PaginationHelper {
  static createPagination(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    };
  }

  static getPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  static createLinks(base_url, page, totalPages, query = {}) {
    const queryString = new URLSearchParams(query).toString();
    const baseUrlWithQuery = queryString ? `${base_url}?${queryString}` : base_url;

    return {
      first: `${baseUrlWithQuery}&page=1`,
      last: `${baseUrlWithQuery}&page=${totalPages}`,
      prev: page > 1 ? `${baseUrlWithQuery}&page=${page - 1}` : null,
      next: page < totalPages ? `${baseUrlWithQuery}&page=${page + 1}` : null,
    };
  }
}

class FilterHelper {
  static createFilters(query, allowedFilters = {}) {
    const filters = {};

    Object.keys(allowedFilters).forEach(key => {
      if (query[key]) {
        const filterType = allowedFilters[key];
        
        switch (filterType) {
          case 'string':
            filters[key] = { contains: query[key], mode: 'insensitive' };
            break;
          case 'exact':
            filters[key] = query[key];
            break;
          case 'number':
            const numValue = parseFloat(query[key]);
            if (!isNaN(numValue)) {
              filters[key] = numValue;
            }
            break;
          case 'boolean':
            filters[key] = query[key] === 'true';
            break;
          case 'array':
            if (Array.isArray(query[key])) {
              filters[key] = { in: query[key] };
            } else if (typeof query[key] === 'string') {
              filters[key] = { in: query[key].split(',') };
            }
            break;
        }
      }
    });

    return filters;
  }

  static createSortOptions(query, allowedSortFields = []) {
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    if (!allowedSortFields.includes(sortBy)) {
      return { createdAt: 'desc' };
    }

    return { [sortBy]: sortOrder };
  }
}

module.exports = {
  ApiResponse,
  PaginationHelper,
  FilterHelper,
};
