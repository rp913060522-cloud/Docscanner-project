'use strict';

/**
 * StudyGen AI — ObjectId Validation Middleware
 *
 * Validates route params (default: 'id') to ensure they are valid MongoDB ObjectIds.
 * Prevents Mongoose CastError and returns a clean 400 response.
 */

const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Middleware factory or standard middleware to validate ObjectId param.
 *
 * @param {string} [paramName='id']
 */
function validateObjectId(paramName = 'id') {
  return function (req, res, next) {
    const id = req.params[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Invalid ${paramName} format.`, 400, 'INVALID_ID'));
    }
    next();
  };
}

module.exports = validateObjectId;
