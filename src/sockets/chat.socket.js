import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';

/**
 * Initializes all Socket.IO real-time chat logic.
 * This file is responsible ONLY for sockets (no HTTP routes here).
 */
export default function initSocket(io) {

    /**
     * Keeps track of which user is connected on which socket
     * Structure: { userId: socketId }
     */
    const userSocketMap = {};

    /**
     * Socket authentication middleware
     */
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('Authentication Error: Token not provided.'));
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                return next(new Error('Authentication Error: Invalid token.'));
            }

            try {
                const user = await User.findById(decoded?._id);
                if (!user) {
                    return next(new Error('Authentication Error: User not found.'));
                }
                socket.user = user;
                next();
            } catch (error) {
                return next(new Error('Authentication Error: Database failed.'));
            }
        });
    });

    /**
     * Fired when a new client successfully connects
     */
    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();

        // Map userId → socketId for direct messaging
        userSocketMap[userId] = socket.id;

        console.log(`✅ User connected: ${socket.user.username} (${socket.id})`);

        /**
         * Client emits this event when sending a message
         * Payload: { receiverId, content }
         */
        socket.on('sendMessage', async ({ receiverId, content }) => {
            console.log("📩 Attempting to save message..."); // Debug Log

            try {
                const senderId = socket.user._id;

                // Create a deterministic conversationId
                const conversationId = [senderId.toString(), receiverId].sort().join('_');

                // 1. Persist message to database
                const newMessage = await Message.create({
                    sender: senderId,
                    receiver: receiverId,
                    content,
                    conversationId
                });

                console.log("✅ Message Saved to DB! ID:", newMessage._id); // Success Log

                // 2. Prepare payload
                const messagePayload = {
                    _id: newMessage._id,
                    sender: senderId.toString(),
                    receiver: receiverId,
                    content: newMessage.content,
                    createdAt: newMessage.createdAt
                };

                // 3. Find receiver's active socket and Emit
                const receiverSocketId = userSocketMap[receiverId];
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receiveMessage', messagePayload);
                }

                // 4. Emit back to Sender (To confirm save & sync UI)
                // This ensures the sender sees the "real" saved message with the correct DB timestamp
                io.to(socket.id).emit('receiveMessage', messagePayload);

            } catch (error) {
                // 🔥 CRITICAL ERROR LOGGING
                console.error("❌ CRITICAL DATABASE ERROR:", error.message);
                console.error(error); 
                
                // Optional: Notify client of failure
                // socket.emit('messageError', { error: "Failed to send message" });
            }
        });

        /**
         * Fired automatically when client disconnects
         */
        socket.on('disconnect', () => {
            delete userSocketMap[userId];
            console.log(`🔥 User disconnected: ${socket.user.username}`);
        });
    });
}