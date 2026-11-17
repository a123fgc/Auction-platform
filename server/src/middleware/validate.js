const ApiError = require('../utils/ApiError');

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        ApiError.badRequest('Validation failed', parsed.error.flatten())
      );
    }
    req.body = parsed.data;
    next();
  };
}

validate.query = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return next(ApiError.badRequest('Invalid query parameters', parsed.error.flatten()));
  }
  req.validatedQuery = parsed.data;
  next();
};

validate.params = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) {
    return next(ApiError.badRequest('Invalid path parameters', parsed.error.flatten()));
  }
  req.validatedParams = parsed.data;
  next();
};

module.exports = validate;
