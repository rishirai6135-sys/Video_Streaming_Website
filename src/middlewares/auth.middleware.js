import { jwt } from "jsonwebtoken";
import ApiError from "../utils/ApiError";
import asyncHandler from "../utils/asyncHandler";
import { User } from "../models/user.model";

export const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token) new ApiError(401, "Unautorized Request");
    
        const decodedToken = jwt.verify(token, procces.env.ACCESS_TOKEN_SECRET);
    
        const currUser = await User.findById(decodedToken?._id).select("-password -refreshToken");
        
        if (!currUser) throw new ApiError(401, "Invalid Access Token");
    
        req.currUser = currUser;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
})