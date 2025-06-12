# Discord Tools

various tools for interacting with Discord 

## Using
all of these classes are built to run using [Deno](https://deno.land)

example useage: 
```deno run --allow-net --allow-read exec/test-msg-fetch.js```

## Discord Message Fetch

a class for fetching messages from a Discord channel with a given channel ID and message limit

## Discord Message Purge

a class for purging messages from a Discord channel with a user ID, channel ID, and message limit.

## Discord Server Nickname Enforcer

 A simple class that monitors and resets your chosen nickname on a Discord server, ensuring it remains unchanged even if altered by random server staff or bots.

### Example Configuration

Here's an example config with two different servers

```
[
    {
        "userId": "4000000000000000000",
        "intendedName": "Name111",
        "auth": "YOUR_DISCORD_TOKEN_HERE",
        "guild": "1111111111111111111"
    },
    {
        "userId": "6000000000000000000",
        "intendedName": "Name222",
        "auth": "YOUR_DISCORD_TOKEN_HERE",
        "guild": "22222222222222222222"
    }
] 
```
