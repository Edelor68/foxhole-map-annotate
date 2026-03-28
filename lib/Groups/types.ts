export interface GroupsFile {
  groups: Record<string, Group>;
  hash: string;
}

export interface Group {
  name: string;
  creator: string;

  individual_members?: Record<
    string,
    {
      id: string;
      username?: string;
    }
  >;

  discord_roles?: Record<string, DiscordRole>;

  permissions?: Record<string, boolean>;
}

export interface DiscordRole {
  role: string;
  server: string;
  info?: string;
}

export interface GroupMembership {
  userId: string;
  source: {
    guildId: string;
    roleIds: string[];
  }
  | "individual";

  verifiedAt: number; // Date.now() ms
  membershipStale: boolean;

  discord?: {
    guildId: string;
    roleIds: string[];
  };
}

