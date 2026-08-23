export type CharacterName = "ONYX" | "NOVA" | "RAJ" | "ALEX" | "SIMRAN" | "ANNA" | "SYSTEM";
export type CharacterSwitchResult = "unchanged" | "account_switched" | "authorization_unchanged";

export interface CharacterSwitchRequest {
  fromAccount: string;
  toAccount: string;
  fromRole: string;
  toRole: string;
  fromSessionAssurance: string;
  toSessionAssurance: string;
  fromPermission: string | undefined;
  toPermission: string | undefined;
  toCharacter: CharacterName | string;
}

export function isCharacterSwitchAuthorizationSafe(input: CharacterSwitchRequest): boolean {
  return (
    input.fromAccount === input.toAccount &&
    input.fromRole === input.toRole &&
    input.fromSessionAssurance === input.toSessionAssurance &&
    input.fromPermission === input.toPermission &&
    !["SYSTEM"].includes(input.toCharacter)
  );
}
