import { assertVaultReference } from "./validators";
import type { VaultReferenceMetadata } from "./model";
export function createVaultReference(value: unknown): VaultReferenceMetadata { return assertVaultReference(value); }