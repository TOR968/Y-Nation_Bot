# Y-Nation_Bot

| ✅  | Feature                     |
| --- | --------------------------- |
| ✅  | Daily rewards automation    |
| ✅  | Multiple account support    |
| ✅  | Proxy support (SOCKS/HTTP)  |
| ✅  | Quest automation            |
| ✅  | Lesson automation           |
| ✅  | User-Agent rotation         |
| ✅  | Scheduled runs              |

## For suggestions or to report a bug, please contact [telegram](https://t.me/tor_dev)

## [Support the development 💙](https://support-me-ruby.vercel.app/)

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/TOR968/Y-Nation_Bot.git
    cd Y-Nation_Bot
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Configure your accounts in `data.txt`:
    ```
    account_1_tgInitData
    account_2_tgInitData
    account_3_tgInitData
    ```

4. (Optional) Add proxies to `proxy.txt`:
    ```
    http://user:pass@host:port
    https://user:pass@host:port
    socks4://user:pass@host:port
    socks5://user:pass@host:port
    ```

5. Adjust settings in `config.json`:
    ```json
    {
        "tasksToSkip": ["Task 1", "Task 2"], // List of tasks to skip. Tasks that can only be performed manually
    }
    ```

## How to Get tgInitData

1. Open the game in Telegram or Browser
2. Open Developer Tools (F12)
3. Go to Application tab
4. Look for the `tgWebAppData` parameter
5. Copy the entire value and paste it in `data.txt`

![How to get tgInitData](./img/initParams.png)

## Usage

Run the bot with:
```bash
node index.js
```

## Disclaimer

This bot is for educational purposes only. Use at your own risk and responsibility.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.