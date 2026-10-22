import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"
import dns from "dns"

dns.setServers(['1.1.1.1'])

const connectDB = async () =>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log(`MONGO DB Connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection falied: ", error);
        process.exit(1);
    }
};

export default connectDB;