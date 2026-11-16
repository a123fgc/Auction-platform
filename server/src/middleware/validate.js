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

module.exports = validate;