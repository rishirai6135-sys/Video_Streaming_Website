export default class ApiError extends Error{
    constructor(
        status,
        message = "Something went Wrong",
        errors = [],
        stack = "",
    ){
        super(message);
        this.status = status;
        this.data = null; // Learn
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (stack){
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

    }
}