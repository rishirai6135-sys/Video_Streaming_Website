import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
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
    let {email, username, password} = req.body;

    if (!(username || email)) throw new ApiError(400, "Username or Email is Required");

    const user = await User.findOne({
        $or: [ {username}, {email}]
    });

    if (!user) throw new ApiError(404, "User does not Exists");

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) throw new ApiError(401, "Invalid User Credentials");

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        // Sever Modifiable Only
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser,
             accessToken,
             refreshToken
        },
        "User Logged In Successfully"
    )
    );
});

const loggedOutUser = asyncHandler(async (req, res) => {
    // Clear Cookies and refreshToken From DB
    await User.findByIdAndUpdate(
        req.user._id,
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

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User Logged Out Successfully"));
});

const refreshAccessToken =  asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Request");

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if (!user) throw new ApiError(401, "Invalid Refresh Token");
    
        if (incomingRefreshToken !== user.refreshToken) throw new ApiError(401, "Refresh token is expired or used");
    
    
        const options = {
            httpOnly: true,
            secure: true
        }
        const {newRefreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res.status(200)
        .cookie("accessToken",accessToken )
        .cookie("refreshToken", newRefreshToken)
        .json(new ApiResponse(200, 
            {accessToken,
            refreshToken: newRefreshToken},
            "Access Token refreshed"));
    } catch (error) {
        throw new ApiError(401, error?.message, "Invalid refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, registering) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) throw new ApiError(400, "Invalid Password");

    user.password = newPassword;

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullname, email} = req.body;
    if (!fullname || !email) throw new ApiError(400, "All feilds are requried");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname, 
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) throw new ApiError(400, "Avatar file is missing")

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) throw new ApiError(400, "Cover Image File is missing");

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) throw new ApiError(400, "Cover Image  file is missing")

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

export {
    registerUser,
    loginUser,
    loggedOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};