const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';
const USER1_CREDENTIALS = { identifier: 'user1', password: 'password123' }; // Replace with valid test users
const USER2_CREDENTIALS = { identifier: 'user2', password: 'password123' };

let user1Token, user2Token;
let user1Id, user2Id;
let conversationId;
let messageId;

async function login(credentials) {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, credentials);
        return res.data;
    } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function runTest() {
    console.log('Starting Messaging Verification...');

    // 1. Login Users
    console.log('\n1. Logging in users...');
    const user1 = await login(USER1_CREDENTIALS);
    user1Token = user1.token;
    user1Id = user1.user._id;
    console.log(`User 1 logged in: ${user1.user.username} (${user1Id})`);

    const user2 = await login(USER2_CREDENTIALS);
    user2Token = user2.token;
    user2Id = user2.user._id;
    console.log(`User 2 logged in: ${user2.user.username} (${user2Id})`);

    // 2. Connect Sockets
    console.log('\n2. Connecting sockets...');
    const socket1 = io(SOCKET_URL, { auth: { token: user1Token } });
    const socket2 = io(SOCKET_URL, { auth: { token: user2Token } });

    await new Promise(resolve => {
        let connected = 0;
        socket1.on('connect', () => { connected++; if (connected === 2) resolve(); });
        socket2.on('connect', () => { connected++; if (connected === 2) resolve(); });
    });
    console.log('Sockets connected.');

    // 3. Create/Get Conversation
    console.log('\n3. Creating direct conversation...');
    try {
        // Check if exists first (via getMessages logic which creates if not exists)
        const res = await axios.get(`${API_URL}/conversations/user/${user2Id}`, {
            headers: { Authorization: `Bearer ${user1Token}` }
        });
        conversationId = res.data.conversation._id;
        console.log(`Conversation ID: ${conversationId}`);
    } catch (error) {
        console.error('Error creating conversation:', error.response ? error.response.data : error.message);
    }

    // 4. Send Message (User 1 -> User 2)
    console.log('\n4. Sending message (User 1 -> User 2)...');
    const messageContent = 'Hello from verification script!';

    // Setup listener for User 2 receiving message
    const receivePromise = new Promise(resolve => {
        socket2.on('receive_message', (msg) => {
            console.log('User 2 received message via socket:', msg.content);
            resolve(msg);
        });
    });

    try {
        const res = await axios.post(`${API_URL}/messages`, {
            conversationId: conversationId,
            content: messageContent
        }, {
            headers: { Authorization: `Bearer ${user1Token}` }
        });
        messageId = res.data.messageData._id;
        console.log(`Message sent: ${messageId}`);
    } catch (error) {
        console.error('Error sending message:', error.response ? error.response.data : error.message);
    }

    await receivePromise;

    // 5. Mark as Read (User 2 reads)
    console.log('\n5. Marking message as read (User 2)...');

    // Setup listener for User 1 receiving read receipt
    const readPromise = new Promise((resolve) => {
        socket1.on('message_read', (data) => {
            console.log('User 1 received read receipt via socket:', data);
            if (data.messageId === messageId) resolve();
        });
        // Also listen for bulk read
        socket1.on('messages_read', (data) => {
            console.log('User 1 received bulk read receipt via socket:', data);
            if (data.messageIds && data.messageIds.includes(messageId)) resolve();
        });
    });

    try {
        // Simulate User 2 fetching messages which triggers auto-read
        await axios.get(`${API_URL}/messages/conversation/${conversationId}`, {
            headers: { Authorization: `Bearer ${user2Token}` }
        });
        console.log('User 2 fetched messages (triggering read)');
    } catch (error) {
        console.error('Error fetching/reading messages:', error.response ? error.response.data : error.message);
    }

    await readPromise;
    console.log('Read receipt verified.');

    // 6. Typing Indicators
    console.log('\n6. Testing typing indicators...');

    const typingPromise = new Promise(resolve => {
        socket2.on('user_typing', (data) => {
            console.log('User 2 received typing indicator:', data);
            resolve();
        });
    });

    socket1.emit('start_typing', { conversationId });
    await typingPromise;
    console.log('Typing indicator verified.');

    console.log('\nVerification Complete!');
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
}

runTest();
