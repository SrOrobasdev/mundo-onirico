const mongoose = require('mongoose');
const { AppError } = require('./errorHandler');

const validateObjectId = (req, res, next) => {
  const idParams = ['id', 'dreamId', 'dream_id', 'dream', 'userId', 'user_id'];
  for (const param of idParams) {
    if (req.params[param] && !mongoose.Types.ObjectId.isValid(req.params[param])) {
      return next(new AppError('ID inválido', 404));
    }
  }
  next();
};

module.exports = { validateObjectId };
