import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});
import connectDB from "./db/db.js";
import app from "./app.js";



const PORT = process.env.PORT || 3000;

connectDB()
.then(() => {
    app.listen(PORT, () => {
        console.log(` Server is running at port : ${PORT}`)
    })
    app.on("error", (error) => {
        console.log("ERROR : ", error);
    })
})
.catch((err) =>{
    console.log("Mongo DB Connection Failed : ", err);
})