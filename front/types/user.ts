import { RoleType } from "@app/lib/auth";
import { ModelId } from "@app/lib/databases";

export type WorkspaceType = {
  id: ModelId;
  sId: string;
  name: string;
  allowedDomain: string | null;
  role: RoleType;
};

export type UserProviderType = "github" | "google";

export type UserType = {
  id: ModelId;
  provider: UserProviderType;
  providerId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  image: string | null;
  workspaces: WorkspaceType[];
};

export type UserMetadataType = {
  key: string;
  value: string;
};
