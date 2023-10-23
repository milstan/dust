import {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { getServerSession } from "next-auth/next";
import { Op } from "sequelize";

import { APIErrorWithStatusCode } from "@app/lib/error";
import { Err, Ok, Result } from "@app/lib/result";
import { new_id } from "@app/lib/utils";
import logger from "@app/logger/logger";
import { authOptions } from "@app/pages/api/auth/[...nextauth]";
import { SubscribedPlanType, UserType, WorkspaceType } from "@app/types/user";

import { DustAPICredentials } from "./dust_api";
import { Key, Membership, User, Workspace } from "./models";
import { getActiveWorkspacePlan } from "./plans/subscription";

const {
  DUST_DEVELOPMENT_WORKSPACE_ID,
  DUST_DEVELOPMENT_SYSTEM_API_KEY,
  NODE_ENV,
  DUST_API = "https://dust.tt",
} = process.env;

export type RoleType = "admin" | "builder" | "user" | "none";

/**
 * This is a class that will be used to check if a user can perform an action on a resource.
 * It acts as a central place to enforce permissioning across all of Dust.
 *
 * It explicitely does not store a reference to the current user to make sure our permissions are
 * workspace oriented. Use `getUserFromSession` if needed.
 */
export class Authenticator {
  _workspace: Workspace | null;
  _user: User | null;
  _role: RoleType;
  _subscribedPlan: SubscribedPlanType;

  // Should only be called from the static methods below.
  constructor(
    workspace: Workspace | null,
    user: User | null,
    role: RoleType,
    subscribedPlan: SubscribedPlanType
  ) {
    this._workspace = workspace;
    this._user = user;
    this._role = role;
    this._subscribedPlan = subscribedPlan;
  }

  /**
   * Get a an Authenticator for the target workspace associated with the authentified user from the
   * NextAuth session.
   *
   * @param session any NextAuth session
   * @param wId string target workspace id
   * @returns Promise<Authenticator>
   */
  static async fromSession(session: any, wId: string): Promise<Authenticator> {
    const [workspace, user] = await Promise.all([
      (async () => {
        return await Workspace.findOne({
          where: {
            sId: wId,
          },
        });
      })(),
      (async () => {
        if (!session) {
          return null;
        } else {
          return await User.findOne({
            where: {
              provider: session.provider.provider,
              providerId: session.provider.id.toString(),
            },
          });
        }
      })(),
    ]);

    let role: RoleType = "none";
    let subscribedPlan: SubscribedPlanType | null = null;

    [role, subscribedPlan] = await Promise.all([
      (async (): Promise<RoleType> => {
        if (workspace && user) {
          const membership = await Membership.findOne({
            where: {
              userId: user.id,
              workspaceId: workspace.id,
            },
          });
          return membership &&
            ["admin", "builder", "user"].includes(membership.role)
            ? (membership.role as RoleType)
            : "none";
        }
        return "none";
      })(),
      getActiveWorkspacePlan({ workspaceModelId: workspace?.id || null }),
    ]);

    return new Authenticator(workspace, user, role, subscribedPlan);
  }

  /**
   * Get a an Authenticator for the target workspace and the authentified Super User user from the
   * NextAuth session.
   * Super User will have `role` set to `admin` regardless of their actual role in the workspace.
   *
   * @param session any NextAuth session
   * @param wId string target workspace id
   * @returns Promise<Authenticator>
   */
  static async fromSuperUserSession(
    session: any,
    wId: string
  ): Promise<Authenticator> {
    const [workspace, user] = await Promise.all([
      (async () => {
        return await Workspace.findOne({
          where: {
            sId: wId,
          },
        });
      })(),
      (async () => {
        if (!session) {
          return null;
        } else {
          return await User.findOne({
            where: {
              provider: session.provider.provider,
              providerId: session.provider.id.toString(),
            },
          });
        }
      })(),
    ]);

    const subscribedPlan = await getActiveWorkspacePlan({
      workspaceModelId: workspace?.id || null,
    });

    if (!user || !user.isDustSuperUser) {
      return new Authenticator(workspace, user, "none", subscribedPlan);
    }

    return new Authenticator(workspace, user, "admin", subscribedPlan);
  }

  /**
   * Get an Authenticator from an API key for a given workspace. Why? because by API you may want to
   * access a workspace that is not the API key's workspace (eg include running another's workspace
   * app (dust-apps))
   * @param key Key the API key
   * @param wId string the target workspaceId
   * @returns an Authenticator for wId and the key's own workspaceId
   */
  static async fromKey(
    key: Key,
    wId: string
  ): Promise<{ auth: Authenticator; keyWorkspaceId: string }> {
    const [workspace, keyWorkspace] = await Promise.all([
      (async () => {
        return await Workspace.findOne({
          where: {
            sId: wId,
          },
        });
      })(),
      (async () => {
        return await Workspace.findOne({
          where: {
            id: key.workspaceId,
          },
        });
      })(),
    ]);

    let role = "none" as RoleType;
    if (!keyWorkspace) {
      throw new Error("Key workspace not found");
    }
    if (workspace) {
      if (keyWorkspace.id === workspace.id) {
        role = "builder";
      }
    }

    const subscribedPlan = await getActiveWorkspacePlan({
      workspaceModelId: workspace?.id || null,
    });

    return {
      auth: new Authenticator(workspace, null, role, subscribedPlan),
      keyWorkspaceId: keyWorkspace.sId,
    };
  }

  /**
   * Creates an Authenticator for a given workspace (with role `builder`). Used for internal calls
   * to the Dust API or other functions, when the system is calling something for the workspace.
   * @param workspaceId string
   */
  static async internalBuilderForWorkspace(
    workspaceId: string
  ): Promise<Authenticator> {
    const workspace = await Workspace.findOne({
      where: {
        sId: workspaceId,
      },
    });
    if (!workspace) {
      throw new Error(`Could not find workspace with sId ${workspaceId}`);
    }
    const subscribedPlan = await getActiveWorkspacePlan({
      workspaceModelId: workspace.id,
    });
    return new Authenticator(workspace, null, "builder", subscribedPlan);
  }

  role(): RoleType {
    return this._role;
  }

  isUser(): boolean {
    switch (this._role) {
      case "admin":
      case "builder":
      case "user":
        return true;
      default:
        return false;
    }
  }

  isBuilder(): boolean {
    switch (this._role) {
      case "admin":
      case "builder":
        return true;
      default:
        return false;
    }
  }

  isAdmin(): boolean {
    switch (this._role) {
      case "admin":
        return true;
      default:
        return false;
    }
  }

  workspace(): WorkspaceType | null {
    return this._workspace
      ? {
          id: this._workspace.id,
          sId: this._workspace.sId,
          name: this._workspace.name,
          allowedDomain: this._workspace.allowedDomain || null,
          role: this._role,
          plan: this._subscribedPlan,
          upgradedAt: this._workspace.upgradedAt?.getTime() || null,
        }
      : null;
  }

  /**
   * This is a convenience method to get the user from the Authenticator. The returned UserType
   * object won't have the user's workspaces set.
   * @returns
   */
  user(): UserType | null {
    return this._user
      ? {
          id: this._user.id,
          provider: this._user.provider,
          providerId: this._user.providerId,
          username: this._user.username,
          email: this._user.email,
          name: this._user.name,
          // Not available from this method
          image: null,
          workspaces: [],
          isDustSuperUser: false,
        }
      : null;
  }
}

/**
 * Retrieves the NextAuth session from the request/response.
 * @param req NextApiRequest request object
 * @param res NextApiResponse response object
 * @returns Promise<any>
 */
export async function getSession(
  req: NextApiRequest | GetServerSidePropsContext["req"],
  res: NextApiResponse | GetServerSidePropsContext["res"]
): Promise<any> {
  return await getServerSession(req, res, authOptions);
}

/**
 * Retrieves the user for a given session
 * @param session any NextAuth session
 * @returns Promise<UserType | null>
 */
export async function getUserFromSession(
  session: any
): Promise<UserType | null> {
  if (!session) {
    return null;
  }

  const user = await User.findOne({
    where: {
      provider: session.provider.provider,
      providerId: session.provider.id.toString(),
    },
  });

  if (!user) {
    return null;
  }

  const memberships = await Membership.findAll({
    where: {
      userId: user.id,
      role: { [Op.in]: ["admin", "builder", "user"] },
    },
  });
  const workspaces = await Workspace.findAll({
    where: {
      id: memberships.map((m) => m.workspaceId),
    },
  });

  async function _getWorkspaceType(workspace: Workspace) {
    const m = memberships.find((m) => m.workspaceId === workspace.id);
    let role = "none" as RoleType;
    if (m) {
      switch (m.role) {
        case "admin":
        case "builder":
        case "user":
          role = m.role;
          break;
        default:
          role = "none";
      }
    }
    const plan = await getActiveWorkspacePlan({
      workspaceModelId: workspace.id,
    });
    return {
      id: workspace.id,
      sId: workspace.sId,
      name: workspace.name,
      allowedDomain: workspace.allowedDomain || null,
      role,
      plan,
      upgradedAt: workspace.upgradedAt?.getTime() || null,
    };
  }

  return {
    id: user.id,
    provider: user.provider,
    providerId: user.providerId,
    username: user.username,
    email: user.email,
    name: user.name,
    image: session.user ? session.user.image : null,
    workspaces: await Promise.all(
      workspaces.map((workspace) => _getWorkspaceType(workspace))
    ),
    isDustSuperUser: user.isDustSuperUser,
  };
}

/**
 * Retrieves the API Key from the request.
 * @param req NextApiRequest request object
 * @returns Result<Key, APIErrorWithStatusCode>
 */
export async function getAPIKey(
  req: NextApiRequest
): Promise<Result<Key, APIErrorWithStatusCode>> {
  if (!req.headers.authorization) {
    return new Err({
      status_code: 401,
      api_error: {
        type: "missing_authorization_header_error",
        message: "Missing Authorization header",
      },
    });
  }

  const parse = req.headers.authorization.match(/Bearer (sk-[a-zA-Z0-9]+)/);
  if (!parse || !parse[1] || !parse[1].startsWith("sk-")) {
    return new Err({
      status_code: 401,
      api_error: {
        type: "malformed_authorization_header_error",
        message: "Malformed Authorization header",
      },
    });
  }

  const [key] = await Promise.all([
    Key.findOne({
      where: {
        secret: parse[1],
      },
    }),
  ]);

  if (!key || key.status !== "active") {
    return new Err({
      status_code: 401,
      api_error: {
        type: "invalid_api_key_error",
        message: "The API key provided is invalid or disabled.",
      },
    });
  }

  return new Ok(key);
}

/**
 * Retrieves or create a system API key for a given workspace
 * @param workspace WorkspaceType
 * @returns Promise<Result<Key, Error>>
 */
export async function getOrCreateSystemApiKey(
  workspace: WorkspaceType
): Promise<Result<Key, Error>> {
  let key = await Key.findOne({
    where: {
      workspaceId: workspace.id,
      isSystem: true,
    },
  });
  if (!key) {
    const secret = `sk-${new_id().slice(0, 32)}`;
    key = await Key.create({
      workspaceId: workspace.id,
      isSystem: true,
      secret: secret,
      status: "active",
    });
  }
  if (!key) {
    return new Err(new Error("Failed to create system key"));
  }

  return new Ok(key);
}

/**
 * Retrieves a system API key for the given owner, creating one if needed.
 *
 * In development mode, we retrieve the system API key from the environment variable
 * `DUST_DEVELOPMENT_SYSTEM_API_KEY`, so that we always use our own `dust` workspace in production
 * to iterate on the design of the packaged apps. When that's the case, the `owner` paramater (which
 * is local) is ignored.
 *
 * @param owner WorkspaceType
 * @returns DustAPICredentials
 */
export async function prodAPICredentialsForOwner(
  owner: WorkspaceType,
  {
    useLocalInDev,
  }: {
    useLocalInDev: boolean;
  } = { useLocalInDev: false }
): Promise<DustAPICredentials> {
  if (!NODE_ENV) {
    throw new Error("NODE_ENV is not defined");
  }

  if (
    NODE_ENV === "development" &&
    !DUST_API.startsWith("http://localhost") &&
    !useLocalInDev
  ) {
    if (!DUST_DEVELOPMENT_SYSTEM_API_KEY) {
      throw new Error("DUST_DEVELOPMENT_SYSTEM_API_KEY is not defined");
    }
    if (!DUST_DEVELOPMENT_WORKSPACE_ID) {
      throw new Error("DUST_DEVELOPMENT_WORKSPACE_ID is not defined");
    }
    return {
      apiKey: DUST_DEVELOPMENT_SYSTEM_API_KEY,
      workspaceId: DUST_DEVELOPMENT_WORKSPACE_ID,
    };
  }

  const systemAPIKeyRes = await getOrCreateSystemApiKey(owner);
  if (systemAPIKeyRes.isErr()) {
    logger.error(
      {
        owner,
        error: systemAPIKeyRes.error,
      },
      "Could not create system API key for workspace"
    );
    throw new Error(`Could not create system API key for workspace`);
  }

  return {
    apiKey: systemAPIKeyRes.value.secret,
    workspaceId: owner.sId,
  };
}
