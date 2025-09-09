// Standardized response utilities for consistent API responses

export const successResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    data,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

export const errorResponse = (message, statusCode = 500, errors = null) => {
  return {
    success: false,
    message,
    statusCode,
    errors,
    timestamp: new Date().toISOString()
  };
};

export const paginatedResponse = (data, page, limit, total, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
    timestamp: new Date().toISOString()
  };
};

export const validationErrorResponse = (errors, message = 'Validation failed') => {
  return {
    success: false,
    message,
    statusCode: 400,
    errors,
    timestamp: new Date().toISOString()
  };
};

export const notFoundResponse = (resource = 'Resource') => {
  return {
    success: false,
    message: `${resource} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString()
  };
};

export const unauthorizedResponse = (message = 'Unauthorized') => {
  return {
    success: false,
    message,
    statusCode: 401,
    timestamp: new Date().toISOString()
  };
};

export const forbiddenResponse = (message = 'Forbidden') => {
  return {
    success: false,
    message,
    statusCode: 403,
    timestamp: new Date().toISOString()
  };
};
