(async (channelId, botToken, stickerId = '', limit = 100) => {
    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`, {
            headers: {
                "Authorization": `Bot ${botToken}`;
            }
        });

        const messages = await response.json();
        const messagesWithStickers = messages.filter(message => message.sticker_items && message.sticker_items.length > 0);

        if (stickerId) {
            const messagesWithSpecificSticker = messagesWithStickers.filter(message =>
                message.sticker_items.some(sticker => sticker.id === stickerId)
            );
            console.log(messagesWithSpecificSticker);
        } else {
            console.log(messagesWithStickers);
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
})(
    'YOUR_CHANNEL_ID',
    'YOUR_BOT_TOKEN',
    'YOUR_STICKER_ID',
    100
);