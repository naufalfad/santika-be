export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(msg: string) {
    return new ApiError(400, msg);
  }

  static unauthorized(msg: string = 'Unauthorized access') {
    return new ApiError(401, msg);
  }

  static forbidden(msg: string = 'Access denied') {
    return new ApiError(403, msg);
  }

  static notFound(msg: string = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static internal(msg: string = 'Internal server error') {
    return new ApiError(500, msg);
  }
}
