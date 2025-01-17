import { runGithubWorker } from "./connectors/github/temporal/worker";
import { runGoogleWorker } from "./connectors/google_drive/temporal/worker";
import { runNotionWorker } from "./connectors/notion/temporal/worker";
import { runSlackWorker } from "./connectors/slack/temporal/worker";
import { errorFromAny } from "./lib/error";
import logger from "./logger/logger";

runSlackWorker().catch((err) =>
  logger.error(errorFromAny(err), "Error running slack worker")
);
runNotionWorker().catch((err) =>
  logger.error(errorFromAny(err), "Error running notion worker")
);
runGithubWorker().catch((err) =>
  logger.error(errorFromAny(err), "Error running github worker")
);
runGoogleWorker().catch((err) =>
  logger.error(errorFromAny(err), "Error running google worker")
);
