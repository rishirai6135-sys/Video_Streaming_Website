import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import { use } from "react";

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        use.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};


    } catch (error){
        throw new ApiError(500, "Something Went Wrong while Refresh and Access Token")
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const {fullname, username, email, password} = req.body;
    if (
        [fullname, email, username, password].some((field) => (
            field?.trim() === ""
        ))
    ){
        throw new ApiError(400, "All feilds are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser){
        throw new ApiError(409, "User with email or username exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) throw new ApiError(400, "Avatar is file required");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);


    if (!avatar) throw new ApiError(400, "Avatar is file required");

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) throw new ApiError(500, "Something went wronf while registering user");

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registerd Successfully")
    );
});

const loginUser = asyncHandler(async(req, res) => {
    // req.body -> data
    // usernaem login email login
    // Find user Exist
    // Compare Password
    // Token and Refresh
    // Send Cookies
    // Let user do thing

    const {username, email, password} = req.body;

    if (!username || !email) throw new ApiError(400, "Username or Email is Required");

    const user = await User.findOne({
        $or: [ {username}, {email}]
    });

    if (!user) throw new ApiError(404, "User does not Exists");

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) throw ApiError(401, "Invalid User Credentials");

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
    
    const loggedInUser = User.findById(user._id).select("-password -refreshToken");

    const options = {
        // Sever Modifiable Only
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options).
    json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        },
        "User Logged In Successfully"
    )
    );
});

const loggedOutUser = asyncHandler(async (req, res) => {
    // Clear Cookies and refreshToken From DB
    User.findByIdAndUpdate(
        req.currUser._id,
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return req
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options);
})

export {
    registerUser,
    loginUser,
    loggedOutUser
};