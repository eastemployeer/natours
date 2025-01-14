const AppError = require('./../utils/appError.js');

//handlers for production
const handleDuplicateFieldsDB = () => {
  const message = `Duplicate fields`;
  return new AppError(message, 404);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please login again', 401);

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message); //Object.values makes array from array-like object
  const message = `Invalid input data ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400); //400 - bad request
};

const sendErrorDev = (err, req, res) => {
  //req.originalUrl - route without host
  //API error
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    //RENDERED WEBSITE
    console.error('ERROR ', err);
    res.status(err.statusCode).render('error.pug', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};
const sendErrorProd = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    //operational error - send message to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      //programming or other error
      console.error('ERROR ', err);

      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!',
      });
    }
  }
  //RENDERED WEBSITE
  //operational error
  else if (err.isOperational) {
    res.status(err.statusCode).render('error.pug', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  } else {
    //programming or other error
    console.error('ERROR ', err);

    res.status(err.statusCode).render('error.pug', {
      title: 'Something went wrong!',
      msg: 'Please try again later',
    });
  }
};

module.exports = (err, req, res, next) => {
  //error handling middleware pattern (4 args)
  err.statusCode = err.statusCode || 500; //default
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // let error = { ...err }; - not cloning deep
    let error = Object.assign(err);
    //err.name = CastError w przypadku podania zupełnie błędnego id w requestcie
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    //error code for duplicate fields
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
