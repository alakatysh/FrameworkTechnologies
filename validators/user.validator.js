const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2 },
    age: { type: 'integer', minimum: 18 },
    email: { type: 'string' },
  },
  required: ['name', 'email', 'age'],
  additionalProperties: false,
};

const validateUser = ajv.compile(userSchema);

const validateUserBody = (req, res, next) => {
  const isValid = validateUser(req.body);
  if (!isValid) {
    return res.status(400).json({
      message: 'Помилка валідації',
      errors: validateUser.errors,
    });
  }
  next();
};

module.exports = {
  validateUserBody,
};
