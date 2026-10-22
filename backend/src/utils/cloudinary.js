import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
    api_key: process.env.CLOUNDINARY_API_KEY,
    api_secret: process.env.CLOUNDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if (!localFilePath) return null;
        //upload the file in cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        fs.unlinkSync(localFilePath);
        return response;
    } catch (err) {
        fs.unlinkSync(localFilePath); //remove the locally saved temprorary file as the upload operation got failed
        return null;
    }
}

const deleteOnCloudinary = async (cloudinary_url) => {
    try {
        let public_id = '';
        for (let ch of cloudinary_url){
            public_id += ch;
            if (ch === "/") public_id = '' 
        }
        public_id = public_id.split(".")
    
        await cloudinary.uploader.destroy(public_id[0]);
    } catch (error) {
        return null;
    }
}

export {uploadOnCloudinary, deleteOnCloudinary};