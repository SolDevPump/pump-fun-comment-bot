import { listenToNewTokens } from "./src/listenToNewTokes";
import { Logger } from "./src/logger/logger";
import { displayInputConstructor, displayMenuConstructor } from "./src/menu";
import { getKoh, getAllAccountsWallets } from "./src/pfApi";
import { changeBios } from "./src/pump-fun/accounts/changeBio";
import {
  registrateAccount,
  sleep,
} from "./src/pump-fun/accounts/generateAccounts";
import { parseComments } from "./src/pump-fun/comments/parseComments";
import { postComment, spamComments } from "./src/pump-fun/comments/postComment";
import { readFileByLine, writeArrayToFile } from "./src/utils";
const red = "\x1b[31m";
const reset = "\x1b[0m";

(async () => {
  let logger = new Logger();
  const readFileData = async (logger) => {
    return Promise.all([
      readFileByLine("data/proxies.txt", logger),
      readFileByLine("data/accounts.txt", logger),
      readFileByLine("data/comments.txt", logger),
      readFileByLine("data/comment_pics.txt", logger),
    ]);
  };
  console.clear();
  console.log(
    red +
      `

 /$$$$$$$  /$$$$$$$$         /$$                         /$$          
| $$__  $$| $$_____/        | $$                        | $$          
| $$  \ $$| $$             /$$$$$$    /$$$$$$   /$$$$$$ | $$  /$$$$$$$
| $$$$$$$/| $$$$$         |_  $$_/   /$$__  $$ /$$__  $$| $$ /$$_____/
| $$____/ | $$__/           | $$    | $$  \ $$| $$  \ $$| $$|  $$$$$$ 
| $$      | $$              | $$ /$$| $$  | $$| $$  | $$| $$ \____  $$
| $$      | $$              |  $$$$/|  $$$$$$/|  $$$$$$/| $$ /$$$$$$$/
|__/      |__/               \___/   \______/  \______/ |__/|_______/ 
                                                        By: TG @SolScriptsDev 
        `
  );
  const [proxyList, accountList, commentList, commentPicsList] = await readFileData(logger);

  while (true) {
    let userChoice = await displayMenuConstructor("Choose the module:", [
      "Comment every new token",
      "Comment every new KOH",
      "Comment exact token",
      "Generate accounts",
      "Set nicknames and PFP",
      "Parse comment from token",
      `${red}Exit${reset}`,
    ]);

    if (userChoice === "Generate accounts") {
      let amount = Number(
        (
          await displayInputConstructor(
            "How many accounts do you want to generate? "
          )
        )["variable"]
      );
      let delay = Number(
        (await displayInputConstructor("Enter delay in milliseconds: "))[
          "variable"
        ]
      );
      let tokenList = await registrateAccount(amount, delay);
      const generatedFileName = `accounts/generated_${Date.now()}.txt`;

      if (tokenList.length > 0) {
        await writeArrayToFile(tokenList, generatedFileName);
        logger.success(
          `Saved ${tokenList.length} accounts in ${generatedFileName}`
        );
      } else {
        logger.error("No accounts to save");
      }
    } else if (userChoice === "Parse comment from token") {
      let tokenAddress = (
        await displayInputConstructor("Paste token address: ")
      )["variable"];
      let parsedComments = await parseComments(tokenAddress, logger);
      const parsedCommentsFileName = `parsed_comments/${tokenAddress}.txt`;

      if (parsedComments) {
        await writeArrayToFile(parsedComments, parsedCommentsFileName);
        logger.success(
          `Saved ${parsedComments.length} comments of token ${tokenAddress}`
        );
      } else {
        logger.warn("No comments to be saved!");
      }
    } else if (userChoice === "Set nicknames and PFP") {
      let tokens = await readFileByLine("data/accounts.txt", logger);
      let delay = Number(
        (await displayInputConstructor("Enter delay in milliseconds: "))[
          "variable"
        ]
      );
      await changeBios(tokens, delay, logger);
    } else if (userChoice === "Comment exact token") {
      try {
        const usePics = (
          await displayInputConstructor(
            "Do you want to use pics in comments? y/n: "
          )
        )["variable"];
        let tokenAddress = (
          await displayInputConstructor("Paste token address: ")
        )["variable"];
        let delay = Number(
          (await displayInputConstructor("Enter delay in milliseconds: "))[
            "variable"
          ]
        );
        // const [proxyList, accountList, commentList, commentPicsList] = await readFileData(logger);

        let comments = await spamComments(
          tokenAddress,
          proxyList,
          accountList,
          commentList,
          delay,
          usePics,
          commentPicsList,
          logger
        );
        let replies = comments.replies;
        const formattedReplies = replies.map((reply, index) => ({
          Reply: reply,
        }));
        console.table(formattedReplies);
      } catch (err) {
        logger.error(`Error in comment exact token: ${err}`);
      }
    } else if (userChoice === "Comment every new token") {
      const usePics = (
        await displayInputConstructor(
          "Do you want to use pics in comments? y/n: "
        )
      )["variable"];

      await listenToNewTokens(proxyList, accountList, commentList,usePics, commentPicsList, logger);

      break;
    } else if (userChoice === "Comment every new KOH") {

      let allowedToPost = true;
      let counter = 0;

      // Read input files asynchronously
      // const [proxyList, accountList, commentList, commentPicsList] = await readFileData(logger);


      // Get all account wallet strings
      const returnStringsArray = await getAllAccountsWallets(
        accountList,
        50,
        logger
      );

      // Prompt user for picture usage
      const usePics = (
        await displayInputConstructor(
          "Do you want to use pics in comments? y/n: "
        )
      )["variable"];

      logger.info("Monitoring KOH");

      while (true) {
        const currentKoh = await getKoh();
        logger.info(`KOH: ${currentKoh}`)
        const currentComments = await parseComments(currentKoh, logger, true);

        // Check if any of the comments were made by an account from the list
        allowedToPost = currentComments.every(
          (comment) => !returnStringsArray.includes(comment["user"])
        );

        if (allowedToPost) {
          logger.info(`Posting comment since there is no comment from any of accounts!`)
          const bearer = accountList[counter % accountList.length];
          const proxy = proxyList[counter % proxyList.length];
          const commentText = commentList[counter % commentList.length];
          const pic = commentPicsList[counter % commentPicsList.length];
          counter++;

          // Post comment with or without pictures based on user input
          postComment(
            bearer,
            commentText,
            currentKoh,
            logger,
            proxy,
            counter,
            usePics === "y" ? pic : undefined
          );
        } else {
          logger.warn("No reason to post, KOH has active comment from user");
        }
        await sleep(10000);
      }
    } else if (userChoice === `${red}Exit${reset}`) {
      logger.error("Exiting!");
      process.exit(-1);
    } else {
      logger.error("Unsupported choice");
      process.exit(-1);
    }
  }
})();
