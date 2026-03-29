import { blinkInput } from "./tools/errorBlink";
import type { Group } from "../lib/Groups/types.ts";


type GroupsResponse = {
  groups: Record<string, Group>;
  hash: string;
};

/* =======================
   Groups UI Controller
======================= */

class Groups {
  private groupsData!: GroupsResponse;

  constructor() {
    this.init();
    this.bindUI();
  }

  /* =======================
     Init & Data
  ======================= */

  async init() {
    this.groupsData = await this.loadGroups();
    this.renderGroups();
  }

  async loadGroups() {
    const res = await fetch("/api/groups");
    return await res.json() as GroupsResponse;
  }

  findGroupById(groupId: string): Group | null {
    for (const group of this.groupsData) {
      if (group._id === groupId) {
        return group;
      }
    }
    return null;
  }
  /* =======================
     Rendering
  ======================= */

  renderGroups() {
    if (!this.groupsData) return;

    const list = document.getElementById("group-editor")!;
    const panels = document.querySelector(".tab-content")!;
    const template = document.getElementById("group-editor-template") as HTMLTemplateElement;

    const activeGroupId = this.getActiveGroupId();

    list.innerHTML = "";
    panels.querySelectorAll(".tab-pane[data-group-id]").forEach(p => p.remove());
    for (const group of this.groupsData) {
      const button = this.createGroupButton(group);
      const panel = this.createGroupPanel(group, template);

      list.appendChild(button);
      panels.appendChild(panel);
    }

    if (activeGroupId) {
      document
        .querySelector<HTMLElement>(`[data-bs-target="#group-${activeGroupId}"]`)
        ?.click();
    }
  }

  getActiveGroupId(): string | null {
    const active = document.querySelector<HTMLElement>(
      "#group-editor .list-group-item.active"
    );
    return active?.dataset.bsTarget?.replace("#group-", "") ?? null;
  }

  /* =======================
     Group Button
  ======================= */

  createGroupButton(group: Group): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "list-group-item list-group-item-action group-list truncate";
    btn.textContent = group.name;
    btn.type = "button";
    btn.dataset.bsToggle = "list";
    btn.dataset.bsTarget = `#group-${group._id}`;

    btn.addEventListener("click", () => {
      document.getElementById("create-group")?.classList.remove("active");
    });

    return btn;
  }

  /* =======================
     Group Panel
  ======================= */

  createGroupPanel(group: Group, template: HTMLTemplateElement): HTMLElement {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const root = fragment.querySelector(".tab-pane") as HTMLElement;

    root.id = `group-${group._id}`;
    root.dataset.groupId = group._id;

    this.setupGroupName(group, root);
    this.setupDeleteGroup(group, root);

    this.renderGroupMembers(group, root);
    this.renderGroupRoles(group, root);

    return root;
  }

  setupGroupName(group: Group, root: HTMLElement) {
    const nameInput = root.querySelector<HTMLInputElement>(".group-name-input")!;
    const title = root.querySelector("h4")!;

    nameInput.value = group.name;
    title.textContent = group.name;

    nameInput.addEventListener("blur", async () => {
      const newName = nameInput.value.trim();
      if (!this.validateGroupName(newName, nameInput, root, group)) return;
      
      const el = document.querySelector<HTMLElement>(".group-list.active");
      if (el) {
        el.textContent = newName;
      }

      await this.updateGroup(group._id, "new_group_name", { name: newName });
      title.textContent = newName;
    });
  }

  
  validateGroupName(
    name: string,
    input: HTMLInputElement,
    root: HTMLElement, 
    group: Group = undefined
  ): boolean {
    if (name === group?.name) return false;

    const error = root.querySelector<HTMLElement>(".input-error-text")!;

    if (name.length < 1) {
      blinkInput(input);
      error.classList.remove("d-none");
      error.textContent = "Name cannot be empty.";
      return false;
    }

    if (name.length > 30) {
      blinkInput(input);
      error.classList.remove("d-none");
      error.textContent = "Name too long. Max 30 characters.";
      return false;
    }

    if (!/^[^\x00-\x1F\x7F]+$/.test(name)) {
      blinkInput(input);
      error.classList.remove("d-none");
      error.textContent = "Invalid characters.";
      return false;
    }
    
    const exists = this.groupsData.some(
      g => g.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      blinkInput(input);
      error.classList.remove("d-none");
      error.textContent = "Group name already exists.";
      return false;
    }

    return true;
  }

  getGroupRoot(groupId: string): HTMLElement | null {
    return document.querySelector(`#group-${groupId}`);
  }


  /* =======================
     Members
  ======================= */
  async handleAddMember(btn: HTMLElement) {
    const root = btn.closest(".tab-pane") as HTMLElement;
    if (!root) return;

    const groupId = root.dataset.groupId!;
    const group = this.findGroupById(groupId);
    if (!group) return;

    const memberIdInput = root.querySelector<HTMLInputElement>(".add-member")!;
    const noteInput = root.querySelector<HTMLInputElement>(".add-member-note")!;

    const memberId = memberIdInput.value.trim();
    if (!memberId) return;

    if (!/^\d{18}$/.test(memberId)) {
      blinkInput(memberIdInput);
      return;
    }

    await this.updateGroup(groupId, "add_member", {
      [`individual_members.${memberId}`]: {
          username: noteInput.value.trim(),
      }
    });

    memberIdInput.value = "";
    noteInput.value = "";

    const updatedGroup = this.findGroupById(groupId);
    const liveRoot = this.getGroupRoot(groupId);
    if (!updatedGroup || !liveRoot) return;

    this.renderGroupMembers(updatedGroup, liveRoot);
  }

  renderGroupMembers(group: Group, root: HTMLElement) {
    const list = root.querySelector(".member-list")!;
    list.replaceChildren(); // better than innerHTML = ""

    for (const [id, member] of Object.entries(group.individual_members ?? {})) {
      list.appendChild(
        this.createMemberItem(group, id, member?.username, root)
      );
      list.offsetHeight;
    }
  }


  createMemberItem(group: Group, id: string, username?: string) {
    const template = document.getElementById(
      "member-list-item-template"
    ) as HTMLTemplateElement;

    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const item = fragment.firstElementChild as HTMLElement;

    item.dataset.memberId = id; 

    item.querySelector(".member-info")!.textContent =
      `${username ? username + " - " : ""}${id}`;

    return item;
  }

  async handleRemoveMember(btn: HTMLElement) {
    const root = btn.closest(".tab-pane") as HTMLElement;
    if (!root) return;

    const groupId = root.dataset.groupId!;
    const group = this.findGroupById(groupId);
    if (!group) return;

    const item = btn.closest("li") as HTMLElement;
    const memberId = item.dataset.memberId;
    if (!memberId) return;

    delete group.individual_members?.[memberId];

    await this.updateGroup(groupId, "remove_member", {
      [`individual_members.${memberId}`]: ""
    });

    const updatedGroup = this.findGroupById(groupId);
    const liveRoot = this.getGroupRoot(groupId);
    if (!updatedGroup || !liveRoot) return;

    this.renderGroupMembers(updatedGroup, liveRoot);
  }

  /* =======================
     Roles
  ======================= */

  async handleAddRole(btn: HTMLElement) {
    const root = btn.closest(".tab-pane") as HTMLElement;
    if (!root) return;

    const groupId = root.dataset.groupId!;
    const group = this.findGroupById(groupId);
    if (!group) return;

    const roleId = root.querySelector<HTMLInputElement>(".add-role")!;
    const serverId = root.querySelector<HTMLInputElement>(".add-server")!;
    const note = root.querySelector<HTMLInputElement>(".add-role-note")!;

    const roleIdVal = roleId.value.trim();
    const serverIdVal = serverId.value.trim();
    if (!roleIdVal || !serverIdVal) return;

    await this.updateGroup(groupId, "add_role", {
      [`discord_roles.${roleIdVal}`]: {
          server: serverIdVal,
          info: note.value.trim(),
      }
    });

    roleId.value = "";
    serverId.value = "";
    note.value = "";

    const updatedGroup = this.findGroupById(groupId);
    const liveRoot = this.getGroupRoot(groupId);
    if (!updatedGroup || !liveRoot) return;

    this.renderGroupRoles(updatedGroup, liveRoot);
  }

  renderGroupRoles(group: Group, root: HTMLElement) {
    const list = root.querySelector(".role-list")!;
    list.replaceChildren();

    for (const [roleId, role] of Object.entries(group.discord_roles ?? {})) {

      list.appendChild(this.createRoleItem(group, roleId, role));

      list.offsetHeight;
    }
  }

  createRoleItem(group: Group, roleId: string, role: any) {
    const template = document.getElementById(
      "role-list-item-template"
    ) as HTMLTemplateElement;

    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const item = fragment.firstElementChild as HTMLElement;

    item.dataset.roleId = roleId; 

    item.querySelector(".role-info")!.textContent =
      `${role.info ? role.info + " - " : ""}Role ID: ${roleId} Server ID: ${role.server}`;

    return item;
  }



  async handleRemoveRole(btn: HTMLElement) {
    const root = btn.closest(".tab-pane") as HTMLElement;
    if (!root) return;

    const groupId = root.dataset.groupId!;
    const group = this.findGroupById(groupId);
    if (!group) return;

    const item = btn.closest("li") as HTMLElement;
    const roleId = item.dataset.roleId;
    if (!roleId) return;

    delete group.discord_roles?.[roleId];

    await this.updateGroup(groupId, "remove_role", {
      [`discord_roles.${roleIdVal}`]: ""
    });
    if (!this.groupsData) {
      console.error("groupsData corrupted", this.groupsData);
      return;
    }

    const updatedGroup = this.findGroupById(groupId);
    const liveRoot = this.getGroupRoot(groupId);
    if (!updatedGroup || !liveRoot) return;

    this.renderGroupRoles(updatedGroup, liveRoot);
  }


  /* =======================
     Actions
  ======================= */

  async addGroup() {
    const input = document.getElementById("group-name") as HTMLInputElement;
    const name = input.value.trim();

    if (!name) {
      blinkInput(input);
      return;
    }

    if(!this.validateGroupName(name, input, document.getElementById("create-group-form"))) return

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const text = await res.text(); 
      console.error("Server error:", text);
      throw new Error("Request failed");
    }

    this.groupsData = await res.json();
    this.renderGroups();
  }

  async updateGroup(groupId: string, type: string, body: object) {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Update-Type": type },
      body: JSON.stringify(body),
    });
    const updated = await res.json();

    if (!updated) {
      console.error("Invalid groups response", updated);
      return;
    }

    this.groupsData = updated;
  }

  setupDeleteGroup(group: Group, root: HTMLElement) {
    root.querySelector(".delete-group-btn")!.addEventListener("click", async () => {
      if (!confirm(`Delete "${group.name}" permanently?`)) return;

      const res = await fetch(`/api/groups/${group._id}`, { method: "DELETE" });
      this.groupsData = await res.json();
      this.renderGroups();
    });
  }

  /* =======================
     UI Binding
  ======================= */

  bindUI() {
    document
    .querySelector(".tab-content")!
    .addEventListener("click", e => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("add-role-btn")) {
        this.handleAddRole(target);
      }

      if (target.classList.contains("add-member-btn")) {
        this.handleAddMember(target);
      }

      if (target.classList.contains("remove-role-btn")) {
        this.handleRemoveRole(target);
      }

      if (target.classList.contains("remove-member-btn")) {
        this.handleRemoveMember(target);
      }
    });
    document.getElementById("new-group-btn")!
      .addEventListener("click", () => {
        document.querySelectorAll(".active").forEach(btn => btn.classList.remove("active"));
        document.getElementById("create-group")?.classList.add("active")
      });
    document.getElementById("create-group-form")!
      .addEventListener("submit", async e => {
        e.preventDefault();
        await this.addGroup();
      });
  }
}

/* =======================
   Start
======================= */

new Groups();
