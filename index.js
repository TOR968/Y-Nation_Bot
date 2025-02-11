const fs = require("fs").promises;
const axios = require("axios");
const { scheduleNextRun } = require("./utils/schedule");
const sleep = require("./utils/sleep");
const getRandomNumber = require("./utils/randomNumber");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
const UserAgentManager = require("./utils/userAgentManager");
const userAgentManager = new UserAgentManager();

const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
};

class GameBot {
    constructor() {
        this.baseUrl = "https://ref-app-api.prod.y.info";
        this.taskToSkip = null;
        this.authorizations = [];
        this.proxies = [];
        this.currentAuthIndex = 0;
    }

    async initialize() {
        try {
            const configData = await fs.readFile("./config.json", "utf8");
            this.taskToSkip = JSON.parse(configData).tasksToSkip;
            const authData = await fs.readFile("data.txt", "utf8");
            const proxyData = await fs.readFile("proxy.txt", "utf8");

            this.authorizations = authData
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line);
            this.proxies = proxyData
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line);

            console.log(
                `${colors.green}Initialized with ${this.authorizations.length} authorizations and ${this.proxies.length} proxies${colors.reset}`
            );
        } catch (error) {
            console.log(`${colors.red}Error initializing: ${error.message}${colors.reset}`);
            throw error;
        }
    }

    getProxyAgent(proxyString) {
        if (!proxyString) return null;

        if (proxyString.startsWith("socks")) {
            return new SocksProxyAgent(proxyString);
        }
        return new HttpsProxyAgent(proxyString);
    }

    async makeRequest(method, url, data = null) {
        const auth = this.authorizations[this.currentAuthIndex];
        const proxy = this.proxies[this.currentAuthIndex];
        const userAgent = userAgentManager.getUserAgent(auth);

        const config = {
            method,
            url,
            headers: {
                authorization: `tma ${auth}`,
            },
            ...(data && { data }),
            ...(proxy && { httpsAgent: this.getProxyAgent(proxy) }),
        };

        if (userAgent) {
            config.headers["User-Agent"] = userAgent;
        }

        try {
            // console.log(`${colors.blue}Making ${method} request to ${url}${colors.reset}`);
            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.log(`${colors.red}Request failed: ${error.message}${colors.reset}`);
            throw error;
        }
    }

    async getUserInfo() {
        return await this.makeRequest("GET", `${this.baseUrl}/v1/user/me`);
    }

    async getTasks() {
        return await this.makeRequest("GET", `${this.baseUrl}/v3/tasks?platform=bot`);
    }

    async getStats(taskId) {
        return await this.makeRequest("GET", `${this.baseUrl}/v1/learn/stats`);
    }

    async getLearnSections() {
        return await this.makeRequest("GET", `${this.baseUrl}/v1/learn/sections`);
    }

    async getBalance() {
        return await this.makeRequest("GET", `${this.baseUrl}/v1/user/balance`);
    }

    async dailyLogin() {
        return await this.makeRequest("POST", `${this.baseUrl}/v1/daily/dailyLogin`, {});
    }

    async startFarming() {
        return await this.makeRequest("POST", `${this.baseUrl}/v1/farming/startOrRestart`, {});
    }

    async startTask(taskId) {
        return await this.makeRequest("POST", `${this.baseUrl}/v3/tasks/${taskId}/start`, {});
    }

    async claimTask(taskId) {
        return await this.makeRequest("POST", `${this.baseUrl}/v3/tasks/${taskId}/claim`, {});
    }

    async claimLesson(payload) {
        return await this.makeRequest("POST", `${this.baseUrl}/v1/learn/claim_lesson`, payload);
    }

    async boostStart() {
        return await this.makeRequest("POST", `${this.baseUrl}/v1/farming/boostStart`, {});
    }

    async processAllTasks() {
        try {
            console.log(`${colors.magenta}Starting task processing${colors.reset}`);
            let tasks = await this.getTasks();

            for (const task of tasks.tasks) {
                if (this.taskToSkip.includes(task.title)) {
                    continue;
                }

                if (task.status === "NOT_STARTED") {
                    console.log(`${colors.yellow}Starting task: ${task.title}${colors.reset}`);
                    await this.startTask(task.id);

                    await sleep(getRandomNumber(2000, 5000));
                }
            }

            tasks = await this.getTasks();

            for (const task of tasks.tasks) {
                if (task.status === "STARTED") {
                    if (this.taskToSkip.includes(task.title)) {
                        continue;
                    }

                    console.log(`${colors.green}Claiming task: ${task.title}${colors.reset}`);
                    await this.claimTask(task.id);

                    await sleep(getRandomNumber(2000, 5000));
                }
            }

            console.log(`${colors.green}All tasks processed${colors.reset}`);
        } catch (error) {
            console.log(`${colors.red}Error processing tasks: ${error.message}${colors.reset}`);
        }
    }

    async processLearning() {
        try {
            const stats = await this.getStats();

            if (stats.lessons.available > 0) {
                let sectionsData = await this.getLearnSections();

                while (true) {
                    if (!sectionsData || !sectionsData.sections) {
                        console.log(`${colors.red}No sections data available${colors.reset}`);
                        break;
                    }

                    let foundReadyLesson = false;

                    for (const section of sectionsData.sections) {
                        if (!section.lessons || !Array.isArray(section.lessons)) {
                            continue;
                        }

                        for (const lesson of section.lessons) {
                            if (lesson.status === "READY") {
                                foundReadyLesson = true;
                                console.log(`${colors.blue}Processing lesson: ${lesson.title}${colors.reset}`);

                                const payload = {
                                    lesson_id: lesson.id,
                                    answers: lesson.questions.map((question) => ({
                                        question_id: question.id,
                                        answers: question.answers
                                            .filter((answer) => answer.is_correct)
                                            .map((answer) => answer.id),
                                    })),
                                };

                                try {
                                    const response = await this.claimLesson(payload);
                                    console.log(
                                        `${colors.green}Lesson completed: ${lesson.title}\nPoints: ${response.points}${colors.reset}`
                                    );

                                    await sleep(getRandomNumber(40000, 120000));
                                    sectionsData = await this.getLearnSections();
                                    break;
                                } catch (error) {
                                    console.log(`${colors.red}Failed to claim lesson: ${error.message}${colors.reset}`);
                                    continue;
                                }
                            }
                        }

                        if (foundReadyLesson) break;
                    }

                    if (!foundReadyLesson) {
                        console.log(`${colors.yellow}No more READY lessons available${colors.reset}`);
                        break;
                    }
                }
            } else {
                console.log(`${colors.yellow}No lessons available${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.red}Error processing lessons: ${error.message}${colors.reset}`);
        }
    }

    canBoost = (balanceResponse) => {
        const farming = balanceResponse?.farming;
        const currentBoost = farming?.currentBoost;

        if (!currentBoost?.nextAvailableFrom) return true;

        if (currentBoost.nextAvailableFrom?.seconds) {
            return currentBoost.nextAvailableFrom.seconds < Math.floor(Date.now() / 1000);
        }

        return false;
    };

    async run() {
        try {
            await this.initialize();

            for (let i = 0; i < this.authorizations.length; i++) {
                this.currentAuthIndex = i;
                console.log(
                    `${colors.magenta}Processing authorization ${i + 1}/${this.authorizations.length}${colors.reset}`
                );
                console.log(`${colors.green}Proxy: ${this.proxies[i]} ${colors.reset}`);

                const userInfo = await this.getUserInfo();
                console.log(`${colors.green}User info retrieved for: ${userInfo.tgUsername}${colors.reset}`);

                const dailyLoginResponse = await this.dailyLogin();

                const getRewardValue = (dailyLoginResponse) => {
                    try {
                        const dayIndex = dailyLoginResponse.days - 1 > 45 ? 45 : dailyLoginResponse.days - 1;
                        return dailyLoginResponse?.rewardsList?.[dayIndex]?.reward?.value || "N/A";
                    } catch (error) {
                        return "N/A";
                    }
                };

                if (!dailyLoginResponse.isClaimed) {
                    console.log(
                        `${colors.green}Daily login successful, reward received: ${getRewardValue(dailyLoginResponse)}${
                            colors.reset
                        }`
                    );
                } else {
                    console.log(
                        `${colors.yellow}The daily reward was already received today ${getRewardValue(
                            dailyLoginResponse
                        )} ${colors.reset}`
                    );
                }

                const balanceResponse = await this.getBalance();

                if (this.canBoost(balanceResponse)) {
                    await this.boostStart();
                    console.log(`${colors.green}Boost started${colors.reset}`);
                } else {
                    console.log(`${colors.yellow}Boost already started${colors.reset}`);
                }

                const farmingResponse = await this.startFarming();

                if (farmingResponse) {
                    console.log(
                        `${colors.green}Farming started, reward received: ${farmingResponse.reward.value}${colors.reset}`
                    );
                } else {
                    console.log(`${colors.red}Farming failed${colors.reset}`);
                }

                await this.processAllTasks();

                await this.processLearning();

                if (i < this.authorizations.length - 1) {
                    await sleep(getRandomNumber(2000, 5000));
                }
            }
        } catch (error) {
            console.log(`${colors.red}Bot execution failed: ${error.message}${colors.reset}`);
        }

        scheduleNextRun(6, () => this.run());
    }
}

const bot = new GameBot();
bot.run();
