import mongoose from "mongoose"

const connectDB = async () => {
    try {
        if(!process.env.MONGODB_URI){
            throw new Error("MONGODB_URI is missing from environment variables")
        }

        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}${process.env.DB_NAME}`)
        console.log(`MongoDB Connected Successfully!`, connectionInstance.connection.host)
        
    } catch (error) {
        console.error("Error while connecting to MongoDB:", error.message)
        console.error("Full error:", error)
        process.exit(1)
    }
} 

export default connectDB